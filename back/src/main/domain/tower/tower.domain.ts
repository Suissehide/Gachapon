import Boom from '@hapi/boom'
import { z } from 'zod/v4'

import type { Prisma } from '../../../generated/client'
import type { CardRarity, EquipmentSlot } from '../../../generated/enums'
import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { ITowerRepository } from '../../types/infra/orm/repositories/tower.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import { applyCombatBonuses } from '../campaign/campaign.domain'
import { computeTeamPower, unitPower } from '../campaign/campaign-power'
import {
  enemyNameFromAppearance,
  resolveEnemyImageUrl,
} from '../campaign/enemy-appearance'
import {
  type AttackPattern,
  type SimulatorUnit,
  simulateBattle,
} from '../combat/battle-simulator.domain'
import {
  type CombatStatsBaseline,
  computeFinalStats,
  mitigationRefFor,
} from '../combat/combat-stats.domain'
import { computeEquippedCardStats } from '../combat/equipped-card-stats'
import {
  INITIAL_SUBSTATS_BY_RARITY,
  rollInitialSubstats,
  SUBSTAT_RANGE_CONFIG_KEYS,
  type Substat,
  type SubstatRanges,
  substatRangesFromConfig,
} from '../equipment/equipment-progression'
import {
  SET_BONUS_CONFIG_KEYS,
  type SetDefinition,
  type SetKey,
  setBonusesFromConfig,
} from '../equipment/set-bonuses'
import { milestonesCrossed, skillPointsGained } from '../shared/level-rewards'
import { retryOnSerialization } from '../shared/retry-serialization'
import { calculateLevel } from '../shared/xp'
import { rollTowerDrop } from './tower-drop'
import {
  TOWER_ELEMENTS,
  TOWER_FLOOR_COUNT,
  type TowerElement,
} from './tower-slots'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

// Un ennemi stocké dans TowerFloor.enemyTeam (Json). Même schéma que
// CampaignStage.enemyTeam (voir campaign.domain.ts) : mitigationScale
// obligatoire (les ennemis de tour sont seedés à level 1 / palier 1, leur
// puissance étant pré-cuite via ce facteur — cf. towerEnemyPower côté seed),
// les quatre stats de stuff optionnelles (surcharge par le seed, aucune tour
// n'en surcharge à ce jour).
const towerEnemySpecSchema = z.object({
  baseHp: z.number(),
  baseAtk: z.number(),
  baseDef: z.number(),
  baseSpd: z.number(),
  level: z.number(),
  palier: z.number(),
  attackPattern: z
    .enum(['BASIC', 'AOE_3', 'MULTI_2', 'MONO_AMPLIFIED', 'MONO_DOUBLE'])
    .optional(),
  passiveKey: z.string().nullish(),
  element: z.string().nullish(),
  appearance: z.string().nullish(),
  mitigationScale: z.number(),
  critRate: z.number().optional(),
  critDmg: z.number().optional(),
  armorPen: z.number().optional(),
  lifesteal: z.number().optional(),
})
const towerEnemyTeamSchema = z.array(towerEnemySpecSchema)
type TowerEnemySpec = z.infer<typeof towerEnemySpecSchema>

// lootTable JSON d'un TowerFloor (prisma/seed/tower.ts:towerFloorLoot). Les
// champs guaranteedEquipment/equipmentDropChance/cardChance existent dans le
// JSON seedé mais ne pilotent rien ici : en tour, la pièce est TOUJOURS
// garantie via rollTowerDrop (voir §6 design spec), pas de chance à rouler ;
// et la tour ne drope jamais de carte (cardChance reste à 0 par construction
// du seed — la campagne garde l'or, la poussière et les cartes).
interface TowerFirstClearLoot {
  gold: number
  dust: number
  xp: number
}
interface TowerFarmLoot {
  gold: number
  dust: number
  xp: number
  equipmentWeights: Record<string, number>
}
interface TowerLootTable {
  firstClear: TowerFirstClearLoot
  farm: TowerFarmLoot
}

export interface TowerBattleRewards {
  gold: number
  dust: number
  xp: number
  xpBefore: number
  levelBefore: number
  isFirstClear: boolean
  equipmentDrop: {
    userEquipmentId: string
    equipmentId: string
    name: string
    rarity: Rarity
  }
}

export interface TowerFloorView {
  index: number
  label: string
  isBoss: boolean
  status: 'cleared' | 'current' | 'locked'
  recommendedPower: number
  enemies: {
    id: string
    imageUrl: string | null
    power: number
    element: string | null
  }[]
}

export interface TowerView {
  element: TowerElement
  highestFloor: number
  floors: TowerFloorView[]
}

export interface TowerSummary {
  element: TowerElement
  highestFloor: number
  totalFloors: number
}

/** Une équipe de tour ne peut pas dépasser la taille d'équipe du jeu. */
const MAX_TOWER_TEAM_SIZE = 3

export class TowerDomain {
  readonly #postgresOrm
  readonly #combatPointsTx
  readonly #configService
  readonly #config
  readonly #achievementsDomain
  readonly #storageClient
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #towerRepository: ITowerRepository

  constructor({
    postgresOrm,
    combatPointsTx,
    configService,
    config,
    achievementsDomain,
    storageClient,
    userRewardRepository,
    skillTreeRepository,
    towerRepository,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#combatPointsTx = combatPointsTx
    this.#configService = configService
    this.#config = config
    this.#achievementsDomain = achievementsDomain
    this.#storageClient = storageClient
    this.#userRewardRepository = userRewardRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#towerRepository = towerRepository
  }

  /**
   * Les quatre tours, avec la progression du joueur sur chacune.
   */
  async listTowers(userId: string): Promise<TowerSummary[]> {
    const progressRows = await this.#towerRepository.getProgress(userId)
    const byElement = new Map(
      progressRows.map((p) => [p.element, p.highestFloor]),
    )
    return TOWER_ELEMENTS.map((element) => ({
      element,
      highestFloor: byElement.get(element) ?? 0,
      totalFloors: TOWER_FLOOR_COUNT,
    }))
  }

  /**
   * Détail d'une tour : ses étages avec leur statut pour ce joueur.
   */
  async getTower(userId: string, element: TowerElement): Promise<TowerView> {
    const [floors, progressRows] = await Promise.all([
      this.#towerRepository.listFloors(element),
      this.#towerRepository.getProgress(userId),
    ])
    const highestFloor =
      progressRows.find((p) => p.element === element)?.highestFloor ?? 0

    const floorViews: TowerFloorView[] = floors.map((f) => {
      let status: TowerFloorView['status']
      if (f.index <= highestFloor) {
        status = 'cleared'
      } else if (f.index === highestFloor + 1) {
        status = 'current'
      } else {
        status = 'locked'
      }
      const enemyTeam = towerEnemyTeamSchema.parse(f.enemyTeam)
      return {
        index: f.index,
        label: f.label,
        isBoss: f.index === TOWER_FLOOR_COUNT,
        status,
        recommendedPower: computeTeamPower(enemyTeam),
        enemies: enemyTeam.map((e, idx) => ({
          id: `B${idx}`,
          imageUrl: this.#resolveEnemyImage(e.appearance),
          power: unitPower(e),
          element: e.element ?? null,
        })),
      }
    })

    return { element, highestFloor, floors: floorViews }
  }

  /**
   * Combat de tour : débite les points de combat, simule le combat, et en
   * cas de victoire crédite les gains + la pièce garantie, atomiquement.
   */
  fight(
    userId: string,
    element: TowerElement,
    floor: number,
    userCardIds: string[],
  ): Promise<{
    won: boolean
    log: unknown[]
    rewards: TowerBattleRewards | null
    teamA: SimulatorUnit[]
    teamB: SimulatorUnit[]
  }> {
    if (userCardIds.length === 0 || userCardIds.length > MAX_TOWER_TEAM_SIZE) {
      throw Boom.badRequest('Composez une équipe de 1 à 3 cartes pour la tour')
    }

    return retryOnSerialization(async () => {
      // Lire la config ET les effets AVANT la transaction (évite les I/O
      // async dans un tx Serializable) — même motif que campaign.domain.
      const [battleCfg, effects, substatRanges] = await Promise.all([
        this.#configService.getMany(
          'combat.battleCost',
          'combat.elementAdvantageMult',
          'combat.elementDisadvantageMult',
          'combat.defMitigationRef',
          'combat.baseCritRate',
          'combat.baseCritDmg',
          'combat.baseArmorPen',
          'combat.baseLifesteal',
          'xp.base',
          'xp.slope',
          'xp.levelCap',
          'levelup.refillEnergy',
          ...SET_BONUS_CONFIG_KEYS,
        ),
        this.#skillTreeRepository.getEffectsForUser(userId),
        this.#getSubstatRanges(),
      ])
      const setDefs = setBonusesFromConfig(battleCfg)

      return this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: motif calqué sur campaign.domain#attackStage
        async (tx) => {
          const towerFloor = await tx.towerFloor.findUnique({
            where: { element_index: { element, index: floor } },
          })
          if (!towerFloor) {
            throw Boom.notFound('Étage de tour introuvable')
          }

          // Débit des points de combat (coût GlobalConfig). Pas d'énergie
          // dédiée : la tour puise dans le même stock que la campagne.
          const battleCost = battleCfg['combat.battleCost']
          await this.#combatPointsTx.debitInTx(tx, userId, battleCost, effects)

          const progress = await tx.userTowerProgress.findUnique({
            where: { userId_element: { userId, element } },
          })
          const currentHighest = progress?.highestFloor ?? 0
          if (floor > currentHighest + 1) {
            throw Boom.badRequest('Étage de tour verrouillé')
          }

          const baseStats: CombatStatsBaseline = {
            critRate: battleCfg['combat.baseCritRate'],
            critDmg: battleCfg['combat.baseCritDmg'],
            armorPen: battleCfg['combat.baseArmorPen'],
            lifesteal: battleCfg['combat.baseLifesteal'],
          }
          const teamUnits = await this.#buildPlayerSimUnits(
            tx,
            userId,
            userCardIds,
            battleCfg['combat.defMitigationRef'],
            baseStats,
            setDefs,
          )
          if (teamUnits.length === 0) {
            throw Boom.badRequest(
              'Aucune des cartes fournies n’appartient à ce joueur',
            )
          }
          const enemyUnits = this.#buildEnemySimUnits(
            towerEnemyTeamSchema.parse(towerFloor.enemyTeam),
            battleCfg['combat.defMitigationRef'],
            baseStats,
          )

          const seed = `${userId}:tower:${element}:${floor}:${Date.now()}`
          const sim = simulateBattle({
            teamA: teamUnits,
            teamB: enemyUnits,
            seed,
            elementAdvantageMult: battleCfg['combat.elementAdvantageMult'],
            elementDisadvantageMult:
              battleCfg['combat.elementDisadvantageMult'],
          })

          const won = sim.won === 'A'
          let rewards: TowerBattleRewards | null = null

          if (won) {
            const loot = towerFloor.lootTable as unknown as TowerLootTable
            const isFirstClear = floor > currentHighest
            const rawLoot = isFirstClear ? loot.firstClear : loot.farm
            // Bonus de skill tree sur or/xp — dust exclu par design (parité
            // campagne). Le drop d'équipement n'est PAS un tirage à chance,
            // donc dropBonus n'a aucune prise ici : équipementDropChance/
            // cardChance sont passés en valeurs neutres, non réutilisées.
            const bonused = applyCombatBonuses(
              {
                gold: rawLoot.gold,
                xp: rawLoot.xp,
                equipmentDropChance: 1,
                cardChance: 0,
              },
              effects,
            )

            // Pièce garantie — jamais de branche « pas de pièce ». Set
            // d'abord, rareté ensuite (ordre PRNG imposé par rollTowerDrop).
            // Les poids de rareté par étage vivent dans farm.equipmentWeights
            // du seed, indépendamment de firstClear/farm.
            const drop = rollTowerDrop({
              element,
              weights: loot.farm.equipmentWeights,
              prng: Math.random,
            })
            const equipment = await tx.equipment.findUnique({
              where: {
                slot_setKey_rarity: {
                  slot: drop.slot as EquipmentSlot,
                  setKey: drop.setKey,
                  rarity: drop.rarity as CardRarity,
                },
              },
            })
            if (!equipment) {
              // Ne doit jamais arriver : la contrainte d'unicité de la tâche 1
              // et le catalogue de 140 pièces de la tâche 2 couvrent toutes
              // les combinaisons (slot, setKey, rarity). Si ça arrive, le
              // catalogue est incomplet — on le signale plutôt que de
              // l'avaler silencieusement.
              throw new Error(
                `Pièce de tour introuvable pour ${drop.slot}/${drop.setKey}/${drop.rarity} — catalogue incomplet`,
              )
            }
            const ue = await tx.userEquipment.create({
              data: {
                userId,
                equipmentId: equipment.id,
                substats: rollInitialSubstats(
                  INITIAL_SUBSTATS_BY_RARITY[
                    drop.rarity as keyof typeof INITIAL_SUBSTATS_BY_RARITY
                  ],
                  substatRanges,
                  Math.random,
                ) as unknown as Prisma.InputJsonValue,
              },
            })

            // Progression : n'avance qu'en cas de victoire, jamais en arrière.
            const newHighest = Math.max(currentHighest, floor)
            if (newHighest !== currentHighest) {
              await tx.userTowerProgress.upsert({
                where: { userId_element: { userId, element } },
                create: { userId, element, highestFloor: newHighest },
                update: { highestFloor: newHighest },
              })
            }

            const { xpBefore, levelBefore } = await this.#applyRewards(
              tx,
              userId,
              bonused.gold,
              rawLoot.dust,
              bonused.xp,
              battleCfg['xp.base'],
              battleCfg['xp.slope'],
              battleCfg['xp.levelCap'],
              battleCfg['levelup.refillEnergy'],
              effects,
            )

            rewards = {
              gold: bonused.gold,
              dust: rawLoot.dust,
              xp: bonused.xp,
              xpBefore,
              levelBefore,
              isFirstClear,
              equipmentDrop: {
                userEquipmentId: ue.id,
                equipmentId: equipment.id,
                name: equipment.name,
                rarity: drop.rarity as Rarity,
              },
            }
          }

          await tx.battleResult.create({
            data: {
              userId,
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

  async #getSubstatRanges(): Promise<SubstatRanges> {
    const c = await this.#configService.getMany(...SUBSTAT_RANGE_CONFIG_KEYS)
    return substatRangesFromConfig(c)
  }

  /**
   * Applique gold/dust/xp, recalcule le niveau, octroie les points de skill
   * et les récompenses de palier franchi. Même motif que
   * campaign.domain#applyRewards (partie XP/niveau), sans le tirage
   * carte/équipement puisque la tour gère sa propre pièce garantie.
   */
  async #applyRewards(
    tx: PrimaTransactionClient,
    userId: string,
    gold: number,
    dust: number,
    xp: number,
    xpBase: number,
    xpSlope: number,
    xpLevelCap: number,
    refillEnergy: number,
    effects: Awaited<ReturnType<ISkillTreeRepository['getEffectsForUser']>>,
  ): Promise<{ xpBefore: number; levelBefore: number }> {
    const userBefore = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    })
    const oldLevel = userBefore?.level ?? 1
    const newXp = (userBefore?.xp ?? 0) + xp
    const newLevel = calculateLevel(newXp, xpBase, xpSlope, xpLevelCap)
    const gained = skillPointsGained(oldLevel, newLevel)
    await tx.user.update({
      where: { id: userId },
      data: {
        gold: { increment: gold },
        dust: { increment: dust },
        dustGenerated: { increment: dust },
        xp: newXp,
        level: newLevel,
        ...(gained > 0 ? { skillPoints: { increment: gained } } : {}),
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
      if (refillEnergy === 1) {
        await this.#combatPointsTx.refillToMaxInTx(tx, userId, effects)
      }
    }
    return { xpBefore: userBefore?.xp ?? 0, levelBefore: oldLevel }
  }

  #resolveEnemyImage(appearance: string | null | undefined): string | null {
    return resolveEnemyImageUrl(
      appearance,
      (key) => this.#storageClient.publicUrl(key),
      this.#config.isDevelopment ? 'staging/' : '',
    )
  }

  async #buildPlayerSimUnits(
    tx: PrimaTransactionClient,
    userId: string,
    userCardIds: string[],
    defMitigationRef: number,
    baseStats: CombatStatsBaseline,
    setDefs: Record<SetKey, SetDefinition>,
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
        const stats = computeEquippedCardStats({
          baseHp: u.card.baseHp,
          baseAtk: u.card.baseAtk,
          baseDef: u.card.baseDef,
          baseSpd: u.card.baseSpd,
          level: u.level,
          palier: u.palier,
          variant: u.variant,
          pieces: u.equipment.map((ue) => ({
            bonuses: (ue.equipment.bonuses ?? {}) as Record<string, number>,
            level: ue.level,
            substats: (ue.substats ?? []) as unknown as Substat[],
            baseBoost: ue.baseBoost,
            setKey: ue.equipment.setKey,
          })),
          setDefs,
          baseStats,
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
          critRate: stats.critRate,
          critDmg: stats.critDmg,
          armorPen: stats.armorPen,
          lifesteal: stats.lifesteal,
          attackPattern: 'BASIC' as AttackPattern,
          passiveKey: u.card.passiveKey,
          element: u.card.element,
          palier: u.palier,
          mitigationRef: mitigationRefFor({
            level: u.level,
            palier: u.palier,
            variant: u.variant,
            defMitigationRef,
          }),
        }
      })
  }

  /**
   * SimulatorUnit pour les ennemis d'un étage de tour. Motif exact de
   * campaign.domain#buildEnemySimUnits : mitigationRef = defMitigationRef ×
   * e.mitigationScale (jamais dérivé du niveau — les ennemis sont seedés à
   * level 1 / palier 1 avec leur puissance pré-cuite dans mitigationScale) ;
   * les quatre stats de stuff prennent les valeurs de base baseStats sauf
   * surcharge explicite du seed.
   */
  #buildEnemySimUnits(
    enemyTeam: TowerEnemySpec[],
    defMitigationRef: number,
    baseStats: CombatStatsBaseline,
  ): SimulatorUnit[] {
    return enemyTeam.map((e, idx) => {
      const stats = computeFinalStats({
        baseHp: e.baseHp,
        baseAtk: e.baseAtk,
        baseDef: e.baseDef,
        baseSpd: e.baseSpd,
        level: e.level,
        palier: e.palier,
        variant: 'NORMAL',
        baseStats: {
          critRate: e.critRate ?? baseStats.critRate,
          critDmg: e.critDmg ?? baseStats.critDmg,
          armorPen: e.armorPen ?? baseStats.armorPen,
          lifesteal: e.lifesteal ?? baseStats.lifesteal,
        },
      })
      return {
        id: `B${idx}`,
        name: enemyNameFromAppearance(e.appearance) ?? `Ennemi ${idx + 1}`,
        imageUrl: this.#resolveEnemyImage(e.appearance),
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
        critRate: stats.critRate,
        critDmg: stats.critDmg,
        armorPen: stats.armorPen,
        lifesteal: stats.lifesteal,
        attackPattern: e.attackPattern ?? 'BASIC',
        passiveKey: e.passiveKey ?? null,
        element: e.element ?? null,
        palier: e.palier,
        mitigationRef: defMitigationRef * e.mitigationScale,
      }
    })
  }
}
