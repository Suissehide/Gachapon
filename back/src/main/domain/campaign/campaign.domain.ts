import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import {
  type AttackPattern,
  type SimulatorUnit,
  simulateBattle,
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
import { milestonesCrossed, skillPointsGained } from '../shared/level-rewards'
import { retryOnSerialization } from '../shared/retry-serialization'
import { calculateLevel } from '../shared/xp'
import { computeTeamPower } from './campaign-power'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

const RARITY_ORDER: Rarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

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
  /** User's total XP right before this battle's rewards were applied. */
  xpBefore: number
  /** User's account level right before this battle's rewards were applied. */
  levelBefore: number
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

export interface RewardPreview {
  firstClear: { gold: number; dust: number; xp: number }
  farm: { gold: number; dust: number; xp: number }
  farmEquipmentChance: number
  farmCardChance: number
  guaranteedEquipment: boolean
  guaranteedCard: boolean
}

/**
 * Extracts a display-friendly reward preview from a raw lootTable JSON value.
 * Pure function. The lootTable is a Prisma JsonValue (non-nullable column,
 * always seeded complete) — a top-level guard turns a malformed row into a
 * debuggable error instead of a cryptic property-read crash across getCampaign.
 */
export function extractRewardPreview(lootTable: unknown): RewardPreview {
  const lt = lootTable as LootTable
  if (!lt?.firstClear || !lt?.farm) {
    throw new Error(
      `Stage has a malformed lootTable: ${JSON.stringify(lootTable)}`,
    )
  }
  const fc = lt.firstClear
  const farm = lt.farm
  return {
    firstClear: { gold: fc.gold, dust: fc.dust, xp: fc.xp },
    farm: { gold: farm.gold, dust: farm.dust, xp: farm.xp },
    farmEquipmentChance: farm.equipmentDropChance,
    farmCardChance: farm.cardChance,
    guaranteedEquipment: fc.guaranteedEquipment != null,
    guaranteedCard: fc.guaranteedCard != null,
  }
}

export interface CampaignStageView {
  id: string
  chapter: number
  index: number
  label: string
  isBoss: boolean
  status: 'cleared' | 'current' | 'locked'
  recommendedPower: number
  rewardPreview: RewardPreview
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

/**
 * Apply skill-tree combat bonuses to a loot entry.
 * Pure function — no side effects.
 *
 * - gold ×(1 + goldBonus/100), rounded
 * - xp  ×(1 + combatXpBonus/100), rounded
 * - equipmentDropChance/cardChance ×(1 + dropBonus/100), capped at 1
 * - dust is intentionally NOT bonused (economy design)
 */
export function applyCombatBonuses(
  loot: {
    gold: number
    xp: number
    equipmentDropChance: number
    cardChance: number
  },
  effects: { goldBonus: number; combatXpBonus: number; dropBonus: number },
): {
  gold: number
  xp: number
  equipmentDropChance: number
  cardChance: number
} {
  return {
    gold: Math.round(loot.gold * (1 + effects.goldBonus / 100)),
    xp: Math.round(loot.xp * (1 + effects.combatXpBonus / 100)),
    equipmentDropChance: Math.min(
      1,
      loot.equipmentDropChance * (1 + effects.dropBonus / 100),
    ),
    cardChance: Math.min(1, loot.cardChance * (1 + effects.dropBonus / 100)),
  }
}

export class CampaignDomain {
  readonly #postgresOrm
  readonly #combatPointsTx
  readonly #configService
  readonly #achievementsDomain
  readonly #storageClient
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #skillTreeRepository: ISkillTreeRepository

  constructor({
    postgresOrm,
    combatPointsTx,
    configService,
    achievementsDomain,
    storageClient,
    userRewardRepository,
    skillTreeRepository,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#combatPointsTx = combatPointsTx
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
    this.#storageClient = storageClient
    this.#userRewardRepository = userRewardRepository
    this.#skillTreeRepository = skillTreeRepository
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

    // The previous chapter is fully cleared iff highestIndex reached the last
    // stage of that chapter (which is the boss). Used to unlock stage 1 of
    // chapter N+1 — must stay consistent with attackStage.
    const prevChapterStages = byChapter.get(progress.highestChapter) ?? []
    const prevChapterMaxIndex = prevChapterStages.reduce(
      (max, s) => (s.index > max ? s.index : max),
      0,
    )
    const previousChapterCleared =
      prevChapterMaxIndex > 0 && progress.highestIndex >= prevChapterMaxIndex

    const chapters: CampaignView['chapters'] = []
    for (const [chapter, ss] of byChapter) {
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing, refactor deferred
      const stageViews = ss.map((s): CampaignStageView => {
        let status: CampaignStageView['status']
        if (chapter < progress.highestChapter) {
          status = 'cleared'
        } else if (chapter === progress.highestChapter + 1) {
          // Next chapter: only stage 1 unlocks, and only if the previous
          // chapter's boss was cleared.
          if (s.index === 1 && previousChapterCleared) {
            status = 'current'
          } else {
            status = 'locked'
          }
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
          recommendedPower: computeTeamPower(
            s.enemyTeam as unknown as EnemySpec[],
          ),
          rewardPreview: extractRewardPreview(s.lootTable),
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
  attackStage(
    userId: string,
    stageId: string,
  ): Promise<{
    won: boolean
    log: unknown[]
    rewards: BattleRewards | null
    teamA: SimulatorUnit[]
    teamB: SimulatorUnit[]
  }> {
    return retryOnSerialization(async () => {
      // Lire la config ET les effets AVANT la transaction (évite les I/O async dans un tx Serializable)
      const [battleCfg, effects] = await Promise.all([
        this.#configService.getMany(
          'combat.battleCost',
          'xp.base',
          'xp.slope',
          'xp.levelCap',
        ),
        this.#skillTreeRepository.getEffectsForUser(userId),
      ])
      return this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing, refactor deferred
        async (tx) => {
          const stage = await tx.campaignStage.findUnique({
            where: { id: stageId },
          })
          if (!stage) {
            throw Boom.notFound('Stage not found')
          }

          // Debit PC (cost from GlobalConfig, default 5)
          const battleCost = battleCfg['combat.battleCost']
          await this.#combatPointsTx.debitInTx(tx, userId, battleCost, effects)

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
          // Cross-chapter unlock requires the previous chapter to be fully
          // cleared (i.e. highestIndex reached the last stage of that chapter,
          // which is the boss). Otherwise a player could clear stage 1-1 then
          // jump straight to 2-1, bypassing the boss gate.
          let isNewChapterFirst = false
          if (
            stage.chapter === progress.highestChapter + 1 &&
            stage.index === 1
          ) {
            const prevChapterMax = await tx.campaignStage.aggregate({
              where: { chapter: progress.highestChapter },
              _max: { index: true },
            })
            const prevMaxIndex = prevChapterMax._max.index ?? 0
            if (prevMaxIndex > 0 && progress.highestIndex >= prevMaxIndex) {
              isNewChapterFirst = true
            }
          }
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
            const rawLoot = stage.lootTable as unknown as LootTable
            const isFirstClear = !isAlreadyCleared
            // Apply skill-tree bonuses to both farm and first-clear loot (dust excluded by design)
            const bonusedFarm = applyCombatBonuses(
              {
                gold: rawLoot.farm.gold,
                xp: rawLoot.farm.xp,
                equipmentDropChance: rawLoot.farm.equipmentDropChance,
                cardChance: rawLoot.farm.cardChance,
              },
              effects,
            )
            const loot: LootTable = {
              firstClear: {
                ...rawLoot.firstClear,
                gold: Math.round(
                  rawLoot.firstClear.gold * (1 + effects.goldBonus / 100),
                ),
                xp: Math.round(
                  rawLoot.firstClear.xp * (1 + effects.combatXpBonus / 100),
                ),
              },
              farm: { ...rawLoot.farm, ...bonusedFarm },
            }
            rewards = await this.#applyRewards(
              tx,
              userId,
              loot,
              isFirstClear,
              battleCfg['xp.base'],
              battleCfg['xp.slope'],
              battleCfg['xp.levelCap'],
            )

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

            await this.#achievementsDomain.track(tx, userId, {
              kind: 'STAGE_CLEARED',
              isBoss: stage.isBoss,
            })
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
    })
  }

  /**
   * Sweep a stage N times (only on already-cleared stages). Applies farm rewards
   * N times in one TX. Cap N at 10 per request.
   */
  sweepStage(
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

    return retryOnSerialization(async () => {
      // Lire la config ET les effets AVANT la transaction (évite les I/O async dans un tx Serializable)
      const [sweepCfg, effects] = await Promise.all([
        this.#configService.getMany(
          'combat.sweepCost',
          'xp.base',
          'xp.slope',
          'xp.levelCap',
        ),
        this.#skillTreeRepository.getEffectsForUser(userId),
      ])
      return this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing, refactor deferred
        async (tx) => {
          const stage = await tx.campaignStage.findUnique({
            where: { id: stageId },
          })
          if (!stage) {
            throw Boom.notFound('Stage not found')
          }

          // Debit PC par run (coût réduit par skill tree, minimum 1, depuis GlobalConfig défaut 5)
          const sweepCost = sweepCfg['combat.sweepCost']
          const effectiveSweepCost = Math.max(
            1,
            sweepCost - effects.sweepCostReduction,
          )
          await this.#combatPointsTx.debitInTx(
            tx,
            userId,
            effectiveSweepCost * runs,
            effects,
          )

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

          const rawFarm = (stage.lootTable as unknown as LootTable).farm
          // Apply skill-tree bonuses once; dust is excluded by design
          const bonusedFarmLoot = applyCombatBonuses(
            {
              gold: rawFarm.gold,
              xp: rawFarm.xp,
              equipmentDropChance: rawFarm.equipmentDropChance,
              cardChance: rawFarm.cardChance,
            },
            effects,
          )
          const loot: FarmLoot = { ...rawFarm, ...bonusedFarmLoot }
          let totalGold = 0
          let totalDust = 0
          let totalXp = 0
          const equipmentDrops: {
            equipmentId: string
            name: string
            rarity: Rarity
          }[] = []
          const cardDrops: { cardId: string; name: string; rarity: Rarity }[] =
            []

          // Catalog snapshots used to pick drops
          const equipmentCatalogRaw = await tx.equipment.findMany({
            select: { id: true, name: true, rarity: true, dropWeight: true },
          })
          const equipmentCatalog: EquipmentCatalogEntry[] =
            equipmentCatalogRaw.map((e) => ({
              id: e.id,
              name: e.name,
              rarity: e.rarity as Rarity,
              dropWeight: e.dropWeight,
            }))
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

            await this.#achievementsDomain.track(tx, userId, {
              kind: 'STAGE_CLEARED',
              isBoss: stage.isBoss,
            })
          }

          // Bump XP and recompute level (parity with applyRewards / gacha).
          const userBefore = await tx.user.findUnique({
            where: { id: userId },
            select: { xp: true, level: true },
          })
          const oldLevel = userBefore?.level ?? 1
          const newXp = (userBefore?.xp ?? 0) + totalXp
          const newLevel = calculateLevel(
            newXp,
            sweepCfg['xp.base'],
            sweepCfg['xp.slope'],
            sweepCfg['xp.levelCap'],
          )
          const sweepGained = skillPointsGained(oldLevel, newLevel)
          await tx.user.update({
            where: { id: userId },
            data: {
              gold: { increment: totalGold },
              dust: { increment: totalDust },
              xp: newXp,
              level: newLevel,
              ...(sweepGained > 0
                ? { skillPoints: { increment: sweepGained } }
                : {}),
            },
          })
          if (newLevel > oldLevel) {
            await this.#achievementsDomain.track(tx, userId, {
              kind: 'LEVEL_UP',
              newLevel,
            })
            for (const pack of milestonesCrossed(oldLevel, newLevel)) {
              const milestoneReward = await tx.reward.create({
                data: { tokens: pack.tokens, dust: pack.dust, xp: 0 },
              })
              await this.#userRewardRepository.upsertInTx(tx, {
                userId,
                rewardId: milestoneReward.id,
                source: 'LEVEL_UP',
                sourceId: `level-${pack.level}`,
              })
            }
          }

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
    })
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing, refactor deferred
  async #applyRewards(
    tx: PrimaTransactionClient,
    userId: string,
    loot: LootTable,
    isFirstClear: boolean,
    xpBase: number,
    xpSlope: number,
    xpLevelCap: number,
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

      // Guaranteed equipment — broaden to any rarity >= minRarity if the
      // rolled rarity has no candidates, so a partial catalog never silently
      // drops the promised drop.
      if (fc.guaranteedEquipment) {
        const fcEquipRarity = rollFirstClearEquipmentRarity(fc, Math.random)
        const minRarity =
          fc.guaranteedEquipment.minRarity ?? fcEquipRarity ?? 'COMMON'
        const minIdx = RARITY_ORDER.indexOf(minRarity)
        const allowedRarities = RARITY_ORDER.slice(minIdx)
        const catalogRaw = await tx.equipment.findMany({
          where: { rarity: { in: allowedRarities as Rarity[] } },
          select: { id: true, name: true, rarity: true, dropWeight: true },
        })
        const catalog: EquipmentCatalogEntry[] = catalogRaw.map((e) => ({
          id: e.id,
          name: e.name,
          rarity: e.rarity as Rarity,
          dropWeight: e.dropWeight,
        }))
        // Prefer the rolled rarity; fall back to any allowed rarity if empty.
        let picked = fcEquipRarity
          ? pickEquipmentForRarity(catalog, fcEquipRarity, Math.random)
          : null
        if (!picked && catalog.length > 0) {
          picked = this.#pickWeighted(catalog, Math.random)
        }
        if (picked) {
          const ue = await tx.userEquipment.create({
            data: { userId, equipmentId: picked.id },
          })
          equipmentDrop = {
            userEquipmentId: ue.id,
            equipmentId: picked.id,
            name: picked.name,
            rarity: picked.rarity,
          }
        }
      }

      // Guaranteed card — same fallback.
      if (fc.guaranteedCard) {
        const fcCardRarity = rollFirstClearCardRarity(fc, Math.random)
        const minRarity =
          fc.guaranteedCard.minRarity ?? fcCardRarity ?? 'COMMON'
        const minIdx = RARITY_ORDER.indexOf(minRarity)
        const allowedRarities = RARITY_ORDER.slice(minIdx)
        // Prefer the rolled rarity; fall back to any allowed.
        let cardsRaw = fcCardRarity
          ? await tx.card.findMany({
              where: {
                rarity: fcCardRarity,
                set: { isActive: true },
              },
              select: {
                id: true,
                name: true,
                rarity: true,
                dropWeight: true,
              },
            })
          : []
        if (cardsRaw.length === 0) {
          cardsRaw = await tx.card.findMany({
            where: {
              rarity: { in: allowedRarities as Rarity[] },
              set: { isActive: true },
            },
            select: {
              id: true,
              name: true,
              rarity: true,
              dropWeight: true,
            },
          })
        }
        if (cardsRaw.length > 0) {
          const picked =
            this.#pickWeighted(cardsRaw, Math.random) ??
            cardsRaw[cardsRaw.length - 1]!
          const { wasDuplicate } = await this.#grantCard(tx, userId, picked.id)
          cardDrop = {
            cardId: picked.id,
            name: picked.name,
            rarity: picked.rarity as Rarity,
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

    // Increment XP, then recompute User.level so threshold crossings actually
    // bump the level (parity with gacha.domain). Without this, campaign XP
    // would never trigger level-ups or LEVEL_UP achievements.
    const userBefore = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    })
    const oldLevel = userBefore?.level ?? 1
    const newXp = (userBefore?.xp ?? 0) + xp
    const newLevel = calculateLevel(newXp, xpBase, xpSlope, xpLevelCap)
    const battleGained = skillPointsGained(oldLevel, newLevel)
    await tx.user.update({
      where: { id: userId },
      data: {
        gold: { increment: gold },
        dust: { increment: dust },
        xp: newXp,
        level: newLevel,
        ...(battleGained > 0
          ? { skillPoints: { increment: battleGained } }
          : {}),
      },
    })
    if (newLevel > oldLevel) {
      await this.#achievementsDomain.track(tx, userId, {
        kind: 'LEVEL_UP',
        newLevel,
      })
      for (const pack of milestonesCrossed(oldLevel, newLevel)) {
        const milestoneReward = await tx.reward.create({
          data: { tokens: pack.tokens, dust: pack.dust, xp: 0 },
        })
        await this.#userRewardRepository.upsertInTx(tx, {
          userId,
          rewardId: milestoneReward.id,
          source: 'LEVEL_UP',
          sourceId: `level-${pack.level}`,
        })
      }
    }

    return {
      gold,
      dust,
      xp,
      xpBefore: userBefore?.xp ?? 0,
      levelBefore: oldLevel,
      isFirstClear,
      equipmentDrop,
      cardDrop,
    }
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
      include: {
        card: { include: { set: true } },
        equipment: { include: { equipment: true } },
      },
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
          imageUrl: u.card.imageUrl
            ? this.#storageClient.publicUrl(u.card.imageUrl)
            : null,
          rarity: u.card.rarity,
          variant: u.variant,
          setName: u.card.set?.name ?? null,
          level: u.level,
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
        imageUrl: null,
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

  #getOrCreateProgress(userId: string) {
    return this.#postgresOrm.prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }
}
