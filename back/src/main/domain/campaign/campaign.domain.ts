import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import {
  type AttackPattern,
  simulateBattle,
  type SimulatorUnit,
} from '../combat/battle-simulator.domain'
import {
  computeFinalStats,
  type EquipmentBonuses,
} from '../combat/combat-stats.domain'
import {
  pickEquipmentForRarity,
  rollFarmCardDrop,
  rollFarmEquipmentDrop,
  rollFirstClearCardRarity,
  rollFirstClearEquipmentRarity,
} from '../combat/equipment-drop.domain'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

interface EnemySpec {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  level: number
  palier: number
  attackPattern?: AttackPattern
  passiveKey?: string | null
}

interface FirstClearLoot {
  gold: number
  dust: number
  xp: number
  guaranteedEquipment?: { minRarity: Rarity } | null
  guaranteedCard?: { minRarity: Rarity } | null
}

interface FarmLoot {
  gold: number
  dust: number
  xp: number
  equipmentDropChance: number
  equipmentWeights: Partial<Record<Rarity, number>>
  cardChance: number
}

interface LootTable {
  firstClear: FirstClearLoot
  farm: FarmLoot
}

export interface BattleRewards {
  gold: number
  dust: number
  xp: number
  isFirstClear: boolean
  equipmentDrop: {
    userEquipmentId: string
    equipmentId: string
    name: string
    rarity: Rarity
  } | null
  cardDrop: {
    cardId: string
    name: string
    rarity: Rarity
    wasDuplicate: boolean
  } | null
}

export interface CampaignStageView {
  id: string
  chapter: number
  index: number
  label: string
  isBoss: boolean
  status: 'cleared' | 'current' | 'locked'
}

export interface CampaignView {
  highestChapter: number
  highestIndex: number
  chapters: { chapter: number; stages: CampaignStageView[] }[]
}

interface EquipmentCatalogEntry {
  id: string
  name: string
  rarity: Rarity
  dropWeight: number
}

interface CardCatalogEntry {
  id: string
  name: string
  rarity: Rarity
  dropWeight: number
}

export class CampaignDomain {
  readonly #postgresOrm

  constructor({ postgresOrm }: IocContainer) {
    this.#postgresOrm = postgresOrm
  }

  /**
   * Returns the full campaign with each stage's status for the user.
   */
  async getCampaign(userId: string): Promise<CampaignView> {
    const orm = this.#postgresOrm
    const progress = await this.#getOrCreateProgress(userId)

    const stages = await orm.prisma.campaignStage.findMany({
      orderBy: [{ chapter: 'asc' }, { index: 'asc' }],
    })

    const byChapter = new Map<number, typeof stages>()
    for (const s of stages) {
      const arr = byChapter.get(s.chapter) ?? []
      arr.push(s)
      byChapter.set(s.chapter, arr)
    }

    const chapters: CampaignView['chapters'] = []
    for (const [chapter, ss] of byChapter) {
      const stageViews = ss.map((s): CampaignStageView => {
        let status: CampaignStageView['status']
        if (chapter < progress.highestChapter) {
          status = 'cleared'
        } else if (chapter > progress.highestChapter) {
          status = 'locked'
        } else if (s.index <= progress.highestIndex) {
            status = 'cleared'
          } else if (s.index === progress.highestIndex + 1) {
            status = 'current'
          } else {
            status = 'locked'
          }
        return {
          id: s.id,
          chapter: s.chapter,
          index: s.index,
          label: s.label,
          isBoss: s.isBoss,
          status,
        }
      })
      chapters.push({ chapter, stages: stageViews })
    }
    chapters.sort((a, b) => a.chapter - b.chapter)

    return {
      highestChapter: progress.highestChapter,
      highestIndex: progress.highestIndex,
      chapters,
    }
  }

  /**
   * Attack a stage: validates unlock, runs the simulator, credits gains atomically.
   */
  async attackStage(
    userId: string,
    stageId: string,
  ): Promise<{
    won: boolean
    log: unknown[]
    rewards: BattleRewards | null
    teamA: SimulatorUnit[]
    teamB: SimulatorUnit[]
  }> {
    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const stage = await tx.campaignStage.findUnique({
          where: { id: stageId },
        })
        if (!stage) {
          throw Boom.notFound('Stage not found')
        }

        const user = await tx.user.findUnique({ where: { id: userId } })
        if (!user) {
          throw Boom.notFound('User not found')
        }

        // Ensure progress row exists (avoid race with the read-side check)
        const progress = await tx.userCampaignProgress.upsert({
          where: { userId },
          create: { userId },
          update: {},
        })

        const isInActiveChapter = stage.chapter === progress.highestChapter
        const isAlreadyCleared =
          stage.chapter < progress.highestChapter ||
          (isInActiveChapter && stage.index <= progress.highestIndex)
        const isCurrent =
          isInActiveChapter && stage.index === progress.highestIndex + 1
        const isNewChapterFirst =
          stage.chapter === progress.highestChapter + 1 && stage.index === 1
        if (!isAlreadyCleared && !isCurrent && !isNewChapterFirst) {
          throw Boom.forbidden('Stage is locked')
        }

        if (user.combatTeam.length === 0) {
          throw Boom.badRequest('Deploy a combat team first')
        }

        const teamUnits = await this.#buildPlayerSimUnits(
          tx,
          userId,
          user.combatTeam,
        )
        const enemyUnits = this.#buildEnemySimUnits(
          stage.enemyTeam as unknown as EnemySpec[],
        )
        const seed = `${userId}:${stageId}:${Date.now()}`
        const sim = simulateBattle({
          teamA: teamUnits,
          teamB: enemyUnits,
          seed,
        })

        const won = sim.won === 'A'
        let rewards: BattleRewards | null = null

        if (won) {
          const loot = stage.lootTable as unknown as LootTable
          const isFirstClear = !isAlreadyCleared
          rewards = await this.#applyRewards(tx, userId, loot, isFirstClear)

          if (isFirstClear) {
            if (isNewChapterFirst) {
              await tx.userCampaignProgress.update({
                where: { userId },
                data: {
                  highestChapter: stage.chapter,
                  highestIndex: stage.index,
                },
              })
            } else if (isCurrent) {
              await tx.userCampaignProgress.update({
                where: { userId },
                data: { highestIndex: stage.index },
              })
            }
          }
        }

        await tx.battleResult.create({
          data: {
            userId,
            stageId,
            seed,
            won,
            log: sim.log as unknown as object,
          },
        })

        return {
          won,
          log: sim.log,
          rewards,
          teamA: teamUnits,
          teamB: enemyUnits,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }

  /**
   * Sweep a stage N times (only on already-cleared stages). Applies farm rewards
   * N times in one TX. Cap N at 10 per request.
   */
  async sweepStage(
    userId: string,
    stageId: string,
    runs: number,
  ): Promise<{
    runs: number
    totalGold: number
    totalDust: number
    totalXp: number
    equipmentDrops: { equipmentId: string; name: string; rarity: Rarity }[]
    cardDrops: { cardId: string; name: string; rarity: Rarity }[]
  }> {
    if (runs < 1 || runs > 10) {
      throw Boom.badRequest('Sweep runs must be 1-10')
    }

    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const stage = await tx.campaignStage.findUnique({
          where: { id: stageId },
        })
        if (!stage) {
          throw Boom.notFound('Stage not found')
        }

        const progress = await tx.userCampaignProgress.findUnique({
          where: { userId },
        })
        if (!progress) {
          throw Boom.forbidden('Stage not cleared yet — cannot sweep')
        }

        const isInActiveChapter = stage.chapter === progress.highestChapter
        const isAlreadyCleared =
          stage.chapter < progress.highestChapter ||
          (isInActiveChapter && stage.index <= progress.highestIndex)
        if (!isAlreadyCleared) {
          throw Boom.forbidden('Stage not cleared yet — cannot sweep')
        }

        const loot = (stage.lootTable as unknown as LootTable).farm
        let totalGold = 0
        let totalDust = 0
        let totalXp = 0
        const equipmentDrops: {
          equipmentId: string
          name: string
          rarity: Rarity
        }[] = []
        const cardDrops: { cardId: string; name: string; rarity: Rarity }[] = []

        // Catalog snapshots used to pick drops
        const equipmentCatalogRaw = await tx.equipment.findMany({
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        const equipmentCatalog: EquipmentCatalogEntry[] = equipmentCatalogRaw.map(
          (e) => ({
            id: e.id,
            name: e.name,
            rarity: e.rarity as Rarity,
            dropWeight: e.dropWeight,
          }),
        )
        const activeCardsRaw = await tx.card.findMany({
          where: { set: { isActive: true } },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        const activeCards: CardCatalogEntry[] = activeCardsRaw.map((c) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity as Rarity,
          dropWeight: c.dropWeight,
        }))

        for (let i = 0; i < runs; i++) {
          totalGold += loot.gold
          totalDust += loot.dust
          totalXp += loot.xp

          const droppedRarity = rollFarmEquipmentDrop(loot, Math.random)
          if (droppedRarity) {
            const candidate = pickEquipmentForRarity(
              equipmentCatalog,
              droppedRarity,
              Math.random,
            )
            if (candidate) {
              await tx.userEquipment.create({
                data: { userId, equipmentId: candidate.id },
              })
              equipmentDrops.push({
                equipmentId: candidate.id,
                name: candidate.name,
                rarity: droppedRarity,
              })
            }
          }

          if (rollFarmCardDrop(loot, Math.random) && activeCards.length > 0) {
            const picked = this.#pickWeighted(activeCards, Math.random)
            if (picked) {
              await this.#grantCard(tx, userId, picked.id)
              cardDrops.push({
                cardId: picked.id,
                name: picked.name,
                rarity: picked.rarity,
              })
            }
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            gold: { increment: totalGold },
            dust: { increment: totalDust },
            xp: { increment: totalXp },
          },
        })

        return {
          runs,
          totalGold,
          totalDust,
          totalXp,
          equipmentDrops,
          cardDrops,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async #applyRewards(
    tx: PrimaTransactionClient,
    userId: string,
    loot: LootTable,
    isFirstClear: boolean,
  ): Promise<BattleRewards> {
    let gold = 0
    let dust = 0
    let xp = 0
    let equipmentDrop: BattleRewards['equipmentDrop'] = null
    let cardDrop: BattleRewards['cardDrop'] = null

    if (isFirstClear) {
      const fc = loot.firstClear
      gold = fc.gold
      dust = fc.dust
      xp = fc.xp

      // Guaranteed equipment
      const fcEquipRarity = rollFirstClearEquipmentRarity(fc, Math.random)
      if (fcEquipRarity) {
        const catalogRaw = await tx.equipment.findMany({
          where: { rarity: fcEquipRarity },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        const catalog: EquipmentCatalogEntry[] = catalogRaw.map((e) => ({
          id: e.id,
          name: e.name,
          rarity: e.rarity as Rarity,
          dropWeight: e.dropWeight,
        }))
        const picked = pickEquipmentForRarity(
          catalog,
          fcEquipRarity,
          Math.random,
        )
        if (picked) {
          const ue = await tx.userEquipment.create({
            data: { userId, equipmentId: picked.id },
          })
          equipmentDrop = {
            userEquipmentId: ue.id,
            equipmentId: picked.id,
            name: picked.name,
            rarity: fcEquipRarity,
          }
        }
      }

      // Guaranteed card
      const fcCardRarity = rollFirstClearCardRarity(fc, Math.random)
      if (fcCardRarity) {
        const cardsRaw = await tx.card.findMany({
          where: { rarity: fcCardRarity, set: { isActive: true } },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        if (cardsRaw.length > 0) {
          const idx = Math.floor(Math.random() * cardsRaw.length)
          const c = cardsRaw[Math.min(idx, cardsRaw.length - 1)]!
          const { wasDuplicate } = await this.#grantCard(tx, userId, c.id)
          cardDrop = {
            cardId: c.id,
            name: c.name,
            rarity: c.rarity as Rarity,
            wasDuplicate,
          }
        }
      }
    } else {
      const farm = loot.farm
      gold = farm.gold
      dust = farm.dust
      xp = farm.xp

      const droppedRarity = rollFarmEquipmentDrop(farm, Math.random)
      if (droppedRarity) {
        const catalogRaw = await tx.equipment.findMany({
          where: { rarity: droppedRarity },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        const catalog: EquipmentCatalogEntry[] = catalogRaw.map((e) => ({
          id: e.id,
          name: e.name,
          rarity: e.rarity as Rarity,
          dropWeight: e.dropWeight,
        }))
        const picked = pickEquipmentForRarity(
          catalog,
          droppedRarity,
          Math.random,
        )
        if (picked) {
          const ue = await tx.userEquipment.create({
            data: { userId, equipmentId: picked.id },
          })
          equipmentDrop = {
            userEquipmentId: ue.id,
            equipmentId: picked.id,
            name: picked.name,
            rarity: droppedRarity,
          }
        }
      }

      if (rollFarmCardDrop(farm, Math.random)) {
        const cardsRaw = await tx.card.findMany({
          where: { set: { isActive: true } },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        if (cardsRaw.length > 0) {
          const cards: CardCatalogEntry[] = cardsRaw.map((c) => ({
            id: c.id,
            name: c.name,
            rarity: c.rarity as Rarity,
            dropWeight: c.dropWeight,
          }))
          const picked = this.#pickWeighted(cards, Math.random)
          if (picked) {
            const { wasDuplicate } = await this.#grantCard(
              tx,
              userId,
              picked.id,
            )
            cardDrop = {
              cardId: picked.id,
              name: picked.name,
              rarity: picked.rarity,
              wasDuplicate,
            }
          }
        }
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        gold: { increment: gold },
        dust: { increment: dust },
        xp: { increment: xp },
      },
    })

    return { gold, dust, xp, isFirstClear, equipmentDrop, cardDrop }
  }

  #pickWeighted<T extends { dropWeight: number }>(
    items: T[],
    prng: () => number,
  ): T | null {
    if (items.length === 0) {
      return null
    }
    const totalWeight = items.reduce((acc, c) => acc + c.dropWeight, 0)
    if (totalWeight <= 0) {
      return items[items.length - 1] ?? null
    }
    let r = prng() * totalWeight
    for (const c of items) {
      r -= c.dropWeight
      if (r <= 0) {
        return c
      }
    }
    return items[items.length - 1] ?? null
  }

  async #grantCard(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
  ): Promise<{ wasDuplicate: boolean }> {
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId_variant: { userId, cardId, variant: 'NORMAL' } },
    })
    if (existing) {
      await tx.userCard.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      })
      return { wasDuplicate: true }
    }
    await tx.userCard.create({
      data: { userId, cardId, variant: 'NORMAL', quantity: 1 },
    })
    return { wasDuplicate: false }
  }

  async #buildPlayerSimUnits(
    tx: PrimaTransactionClient,
    userId: string,
    userCardIds: string[],
  ): Promise<SimulatorUnit[]> {
    const userCards = await tx.userCard.findMany({
      where: { id: { in: userCardIds }, userId },
      include: { card: true, equipment: { include: { equipment: true } } },
    })
    const byId = new Map(userCards.map((u) => [u.id, u]))
    return userCardIds
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => u != null)
      .map((u, idx) => {
        const equipmentBonuses: EquipmentBonuses[] = u.equipment.map(
          (ue) => (ue.equipment.bonuses ?? {}) as EquipmentBonuses,
        )
        const stats = computeFinalStats({
          baseHp: u.card.baseHp,
          baseAtk: u.card.baseAtk,
          baseDef: u.card.baseDef,
          baseSpd: u.card.baseSpd,
          level: u.level,
          palier: u.palier,
          variant: u.variant,
          equipment: equipmentBonuses,
        })
        return {
          id: `A${idx}`,
          name: u.card.name,
          hp: stats.hp,
          atk: stats.atk,
          def: stats.def,
          spd: stats.spd,
          attackPattern: 'BASIC' as AttackPattern,
          passiveKey: u.card.passiveKey,
          palier: u.palier,
        }
      })
  }

  #buildEnemySimUnits(enemyTeam: EnemySpec[]): SimulatorUnit[] {
    return enemyTeam.map((e, idx) => {
      const stats = computeFinalStats({
        baseHp: e.baseHp,
        baseAtk: e.baseAtk,
        baseDef: e.baseDef,
        baseSpd: e.baseSpd,
        level: e.level,
        palier: e.palier,
        variant: 'NORMAL',
      })
      return {
        id: `B${idx}`,
        name: `Ennemi ${idx + 1}`,
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
        attackPattern: e.attackPattern ?? 'BASIC',
        passiveKey: e.passiveKey ?? null,
        palier: e.palier,
      }
    })
  }

  async #getOrCreateProgress(userId: string) {
    return this.#postgresOrm.prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }
}
