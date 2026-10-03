import Boom from '@hapi/boom'
import { z } from 'zod/v4'

import type { Prisma } from '../../../generated/client'
import type { EquipmentSet, EquipmentSlot } from '../../../generated/enums'
import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import type { ITeamProgressionDomain } from '../../types/domain/team-progression/team-progression.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
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
import { CAMPAIGN_TEAM_KEY } from '../combat/combat-team-keys'
import {
  pickEquipmentForRarity,
  rollFarmCardDrop,
  rollFarmEquipmentDrop,
  rollFirstClearCardRarity,
  rollFirstClearEquipmentRarity,
} from '../combat/equipment-drop.domain'
import { computeEquippedCardStats } from '../combat/equipped-card-stats'
import { effectiveSweepCost } from '../combat-points/combat-points.tx'
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
import { levelAfterXpGain } from '../shared/xp'
import { CAMPAIGN_EQUIPMENT_SLOTS } from '../tower/tower-slots'
import { deriveClearFlags } from './campaign-clear-flags'
import { computeTeamPower, unitPower } from './campaign-power'
import {
  enemyNameFromAppearance,
  genericEnemyName,
  resolveEnemyImageUrl,
} from './enemy-appearance'

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

const RARITY_ORDER: Rarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

// Un ennemi stocké dans CampaignStage.enemyTeam (Json). Schéma Zod = source
// unique du type + parse type-safe du Json Prisma (pas de cast unknown).
const enemySpecSchema = z.object({
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
  // Élément (FIRE/WATER/NATURE/EARTH/LIGHT/DARK) ; absent => neutre.
  element: z.string().nullish(),
  // Sous-chemin MinIO sans cards/ ni .png, ex. "monsters/slimes/SLIME-001".
  // Purement cosmétique. Absent => placeholder côté front.
  appearance: z.string().nullish(),
  // Facteur d'échelle de la puissance de l'ennemi, écrit par le seed
  // (enemyScale). Obligatoire : les ennemis sont seedés à level 1 / palier 1
  // avec leur puissance pré-cuite dans leurs stats de base, donc un
  // mitigationRef dérivé du niveau vaudrait toujours 100 pendant que leur DEF
  // est déjà multipliée par ce facteur — voir mitigationRefFor vs #buildEnemySimUnits.
  mitigationScale: z.number(),
  // Stats de stuff : absentes => valeurs de base (GlobalConfig). Point
  // d'extension pour un seed futur (ex. boss « bourreau » à 40 % de critRate) ;
  // aucun ennemi ne les surcharge à ce jour.
  critRate: z.number().optional(),
  critDmg: z.number().optional(),
  armorPen: z.number().optional(),
  lifesteal: z.number().optional(),
})
const enemyTeamSchema = z.array(enemySpecSchema)
type EnemySpec = z.infer<typeof enemySpecSchema>

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

/**
 * Pièce obtenue en combat. Le même objet sert au combat unique et au balayage :
 * les deux écrans de résultat rendent la même fiche côté front, donc ils ne
 * peuvent pas se contenter de charges utiles différentes.
 */
export interface EquipmentDropPayload {
  userEquipmentId: string
  equipmentId: string
  name: string
  rarity: Rarity
  slot: EquipmentSlot
  setKey: EquipmentSet
  level: number
  bonuses: Record<string, number>
  substats: { key: string; value: number }[]
  baseBoost: number
}

/** Carte obtenue en combat — même remarque que {@link EquipmentDropPayload}. */
export interface CardDropPayload {
  cardId: string
  name: string
  rarity: Rarity
  wasDuplicate: boolean
  imageUrl: string | null
  element: string | null
  setName: string
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
  equipmentDrop: EquipmentDropPayload | null
  cardDrop: CardDropPayload | null
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
 *
 * `teamXpBonusPct` is the caller's team `xp` perk effect (percentage points,
 * e.g. 4 for +4 %), resolved ONCE by the caller via `effectsForUser` and
 * passed in — never read from a domain here, that would break purity and
 * turn a per-stage `.map()` into one Postgres query per stage.
 */
export function extractRewardPreview(
  lootTable: unknown,
  teamXpBonusPct: number,
): RewardPreview {
  const lt = lootTable as LootTable
  if (!lt?.firstClear || !lt?.farm) {
    throw new Error(
      `Stage has a malformed lootTable: ${JSON.stringify(lootTable)}`,
    )
  }
  const fc = lt.firstClear
  const farm = lt.farm
  const xpMult = 1 + teamXpBonusPct / 100
  return {
    firstClear: {
      gold: fc.gold,
      dust: fc.dust,
      xp: Math.round(fc.xp * xpMult),
    },
    farm: {
      gold: farm.gold,
      dust: farm.dust,
      xp: Math.round(farm.xp * xpMult),
    },
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
  enemies: {
    id: string
    imageUrl: string | null
    power: number
    element: string | null
  }[]
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
  // Portés jusqu'à la charge utile du drop : l'écran de victoire affiche
  // l'emplacement, le set et la stat principale de la pièce obtenue.
  slot: EquipmentSlot
  setKey: EquipmentSet
  bonuses: Record<string, number>
}

interface CardCatalogEntry {
  id: string
  name: string
  rarity: Rarity
  dropWeight: number
  // Portés jusqu'à la charge utile : l'écran de victoire dessine la carte
  // obtenue, il lui faut son illustration, son élément et son extension.
  imageUrl: string | null
  element: string | null
  setName: string
}

/**
 * Apply skill-tree combat bonuses to a loot entry.
 * Pure function — no side effects.
 *
 * - gold ×(1 + goldBonus/100), rounded
 * - xp  ×(1 + combatXpBonus/100), rounded
 * - equipmentDropChance ×(1 + dropBonus/100), capped at 1
 * - cardChance is intentionally NOT bonused : une carte gagnée en combat
 *   concurrence directement le gacha (0,20 % de légendaire au tirage), un
 *   nœud d'arbre ne doit pas en doubler le débit. `dropBonus` ne porte
 *   donc que sur l'équipement.
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
    cardChance: loot.cardChance,
  }
}

type SkillEffects = Awaited<
  ReturnType<ISkillTreeRepository['getEffectsForUser']>
>
type CombatBonusEffects = Parameters<typeof applyCombatBonuses>[1]

interface StagePosition {
  chapter: number
  index: number
}

interface CampaignProgress {
  highestChapter: number
  highestIndex: number
}

interface StageAccess {
  isAlreadyCleared: boolean
  isCurrent: boolean
  isNewChapterFirst: boolean
}

function isStageCleared(
  stage: StagePosition,
  progress: CampaignProgress,
): boolean {
  return (
    stage.chapter < progress.highestChapter ||
    (stage.chapter === progress.highestChapter &&
      stage.index <= progress.highestIndex)
  )
}

/**
 * Statut d'un étage pour l'écran de campagne. Doit rester cohérent avec le
 * déverrouillage de attackStage : le premier étage du chapitre suivant ne
 * s'ouvre que si le boss du chapitre courant est tombé.
 */
function stageStatus(
  stage: StagePosition,
  progress: CampaignProgress,
  previousChapterCleared: boolean,
): CampaignStageView['status'] {
  if (stage.chapter < progress.highestChapter) {
    return 'cleared'
  }
  if (stage.chapter === progress.highestChapter + 1) {
    return stage.index === 1 && previousChapterCleared ? 'current' : 'locked'
  }
  if (stage.chapter > progress.highestChapter) {
    return 'locked'
  }
  if (stage.index <= progress.highestIndex) {
    return 'cleared'
  }
  return stage.index === progress.highestIndex + 1 ? 'current' : 'locked'
}

/** Butin de farm après bonus skill-tree puis bonus d'équipe `xp` (dust exclu). */
function farmLootWithBonuses(
  rawFarm: FarmLoot,
  effects: CombatBonusEffects,
  teamXpBonusPct: number,
): FarmLoot {
  const bonusedFarm = applyCombatBonuses(
    {
      gold: rawFarm.gold,
      xp: rawFarm.xp,
      equipmentDropChance: rawFarm.equipmentDropChance,
      cardChance: rawFarm.cardChance,
    },
    effects,
  )
  return {
    ...rawFarm,
    ...bonusedFarm,
    xp: Math.round(bonusedFarm.xp * (1 + teamXpBonusPct / 100)),
  }
}

/**
 * Butin d'un combat unique : bonus skill-tree sur premier passage et farm
 * (dust exclu par design). Bonus d'équipe `xp` : multiplicatif, APRÈS le bonus
 * skill-tree, et seulement sur l'XP — « en campagne » n'inclut ni l'or ni les
 * chances de drop, contrairement au skill tree.
 */
function battleLootWithBonuses(
  rawLoot: LootTable,
  effects: CombatBonusEffects,
  teamXpBonusPct: number,
): LootTable {
  const teamXpMult = 1 + teamXpBonusPct / 100
  return {
    firstClear: {
      ...rawLoot.firstClear,
      gold: Math.round(rawLoot.firstClear.gold * (1 + effects.goldBonus / 100)),
      xp: Math.round(
        rawLoot.firstClear.xp * (1 + effects.combatXpBonus / 100) * teamXpMult,
      ),
    },
    farm: farmLootWithBonuses(rawLoot.farm, effects, teamXpBonusPct),
  }
}

function raritiesFrom(minRarity: Rarity): Rarity[] {
  return RARITY_ORDER.slice(RARITY_ORDER.indexOf(minRarity))
}

const EQUIPMENT_CATALOG_SELECT = {
  id: true,
  name: true,
  rarity: true,
  dropWeight: true,
  slot: true,
  setKey: true,
  bonuses: true,
} as const

const CARD_CATALOG_SELECT = {
  id: true,
  name: true,
  rarity: true,
  dropWeight: true,
  imageUrl: true,
  element: true,
  set: { select: { name: true } },
} as const

function toEquipmentCatalogEntry(e: {
  id: string
  name: string
  rarity: string
  dropWeight: number
  slot: EquipmentSlot
  setKey: EquipmentSet
  bonuses: unknown
}): EquipmentCatalogEntry {
  return {
    id: e.id,
    name: e.name,
    rarity: e.rarity as Rarity,
    dropWeight: e.dropWeight,
    slot: e.slot,
    setKey: e.setKey,
    bonuses: (e.bonuses ?? {}) as Record<string, number>,
  }
}

function toCardCatalogEntry(c: {
  id: string
  name: string
  rarity: string
  dropWeight: number
  imageUrl: string | null
  element: string | null
  set: { name: string }
}): CardCatalogEntry {
  return {
    id: c.id,
    name: c.name,
    rarity: c.rarity as Rarity,
    dropWeight: c.dropWeight,
    imageUrl: c.imageUrl,
    element: c.element,
    setName: c.set.name,
  }
}

export class CampaignDomain {
  readonly #postgresOrm
  readonly #combatPointsTx
  readonly #combatTeamTx
  readonly #configService
  readonly #config
  readonly #achievementsDomain
  readonly #storageClient
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #teamProgressionDomain: ITeamProgressionDomain

  constructor({
    postgresOrm,
    combatPointsTx,
    combatTeamTx,
    configService,
    config,
    achievementsDomain,
    storageClient,
    userRewardRepository,
    skillTreeRepository,
    teamProgressionDomain,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#combatPointsTx = combatPointsTx
    this.#combatTeamTx = combatTeamTx
    this.#configService = configService
    this.#config = config
    this.#achievementsDomain = achievementsDomain
    this.#storageClient = storageClient
    this.#userRewardRepository = userRewardRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#teamProgressionDomain = teamProgressionDomain
  }

  /**
   * Returns the full campaign with each stage's status for the user.
   */
  async getCampaign(userId: string): Promise<CampaignView> {
    const orm = this.#postgresOrm
    // Résolu UNE fois pour toute la requête — jamais dans le `.map()` de
    // stages ci-dessous, qui tournerait sinon une requête Postgres par
    // stage sur une route qui rend un chapitre entier.
    const [progress, stages, teamEffects] = await Promise.all([
      this.#getOrCreateProgress(userId),
      orm.prisma.campaignStage.findMany({
        orderBy: [{ chapter: 'asc' }, { index: 'asc' }],
      }),
      this.#teamProgressionDomain.effectsForUser(userId),
    ])

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
      const stageViews = ss.map((s): CampaignStageView => {
        const enemyTeam = enemyTeamSchema.parse(s.enemyTeam)
        return {
          id: s.id,
          chapter: s.chapter,
          index: s.index,
          label: s.label,
          isBoss: s.isBoss,
          status: stageStatus(s, progress, previousChapterCleared),
          recommendedPower: computeTeamPower(enemyTeam),
          rewardPreview: extractRewardPreview(s.lootTable, teamEffects.xp),
          enemies: enemyTeam.map((e, idx) => ({
            id: `B${idx}`,
            imageUrl: this.#resolveEnemyImage(e.appearance),
            power: unitPower(e),
            element: e.element ?? null,
          })),
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
      const [battleCfg, effects, substatRanges, teamEffects] =
        await Promise.all([
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
          this.#teamProgressionDomain.effectsForUser(userId),
        ])
      // Bonus de set : une seule reconstruction par combat, jamais par carte.
      const setDefs = setBonusesFromConfig(battleCfg)
      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const stage = await tx.campaignStage.findUnique({
            where: { id: stageId },
          })
          if (!stage) {
            throw Boom.notFound(errorMessage('campaign.stageNotFound'))
          }

          // Debit PC (cost from GlobalConfig, default 5). Vérifie déjà
          // l'existence de l'utilisateur (Boom.notFound sinon) — inutile de
          // le relire ici pour la même garde.
          const battleCost = battleCfg['combat.battleCost']
          await this.#combatPointsTx.debitInTx(tx, userId, battleCost, effects)

          // Ensure progress row exists (avoid race with the read-side check)
          const progress = await tx.userCampaignProgress.upsert({
            where: { userId },
            create: { userId },
            update: {},
          })

          const access = await this.#resolveStageAccess(tx, stage, progress)

          const { userCardIds } = await this.#combatTeamTx.resolveIdsInTx(
            tx,
            userId,
            CAMPAIGN_TEAM_KEY,
          )
          if (userCardIds.length === 0) {
            throw Boom.badRequest(errorMessage('combat.noTeamComposed'))
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
          const enemyUnits = this.#buildEnemySimUnits(
            enemyTeamSchema.parse(stage.enemyTeam),
            battleCfg['combat.defMitigationRef'],
            baseStats,
          )
          const seed = `${userId}:${stageId}:${Date.now()}`
          const sim = simulateBattle({
            teamA: teamUnits,
            teamB: enemyUnits,
            seed,
            elementAdvantageMult: battleCfg['combat.elementAdvantageMult'],
            elementDisadvantageMult:
              battleCfg['combat.elementDisadvantageMult'],
          })

          const won = sim.won === 'A'
          let rewards: BattleRewards | null = null

          if (won) {
            const isFirstClear = !access.isAlreadyCleared
            rewards = await this.#applyRewards(
              tx,
              userId,
              battleLootWithBonuses(
                stage.lootTable as unknown as LootTable,
                effects,
                teamEffects.xp,
              ),
              isFirstClear,
              battleCfg['xp.base'],
              battleCfg['xp.slope'],
              battleCfg['xp.levelCap'],
              substatRanges,
              battleCfg['levelup.refillEnergy'],
              effects,
            )

            if (isFirstClear) {
              await this.#advanceProgress(tx, userId, stage, access)
            }

            const { flawless, understaffed } = deriveClearFlags(
              sim.log,
              teamUnits,
              stage,
            )
            await this.#achievementsDomain.track(tx, userId, {
              kind: 'STAGE_CLEARED',
              source: 'CAMPAIGN',
              isBoss: stage.isBoss,
              viaSweep: false,
              flawless,
              understaffed,
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
    // État du joueur AVANT que l'XP du balayage ne soit créditée — de quoi
    // laisser le front détecter la montée de niveau et jouer la célébration,
    // comme `BattleRewards` le permet au combat unique.
    xpBefore: number
    levelBefore: number
    equipmentDrops: EquipmentDropPayload[]
    cardDrops: CardDropPayload[]
  }> {
    if (runs < 1 || runs > 10) {
      throw Boom.badRequest(errorMessage('campaign.sweepRunsOutOfRange'))
    }

    return retryOnSerialization(async () => {
      // Lire la config ET les effets AVANT la transaction (évite les I/O async dans un tx Serializable)
      const [sweepCfg, effects, substatRanges, teamEffects] = await Promise.all(
        [
          this.#configService.getMany(
            'combat.sweepCost',
            'xp.base',
            'xp.slope',
            'xp.levelCap',
            'levelup.refillEnergy',
          ),
          this.#skillTreeRepository.getEffectsForUser(userId),
          this.#getSubstatRanges(),
          this.#teamProgressionDomain.effectsForUser(userId),
        ],
      )
      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const stage = await tx.campaignStage.findUnique({
            where: { id: stageId },
          })
          if (!stage) {
            throw Boom.notFound(errorMessage('campaign.stageNotFound'))
          }

          // Debit PC par run (coût réduit par skill tree, minimum 1, depuis
          // GlobalConfig défaut 5). Passe par effectiveSweepCost, la même
          // fonction que GET /combat/points, pour que le prix affiché et le
          // prix débité ne puissent plus diverger.
          const sweepCostPerRun = effectiveSweepCost(
            sweepCfg['combat.sweepCost'],
            effects.sweepCostReduction,
          )
          await this.#combatPointsTx.debitInTx(
            tx,
            userId,
            sweepCostPerRun * runs,
            effects,
          )

          const progress = await tx.userCampaignProgress.findUnique({
            where: { userId },
          })
          if (!progress || !isStageCleared(stage, progress)) {
            throw Boom.forbidden(errorMessage('campaign.stageNotClearedYet'))
          }

          // Même bonus d'équipe `xp`, appliqué après le bonus skill-tree,
          // que le chemin combat unique (`attackStage`). Dust exclu par design.
          const loot = farmLootWithBonuses(
            (stage.lootTable as unknown as LootTable).farm,
            effects,
            teamEffects.xp,
          )
          const { totalGold, totalDust, totalXp, equipmentDrops, cardDrops } =
            await this.#runSweeps(
              tx,
              userId,
              stage.isBoss,
              loot,
              runs,
              substatRanges,
            )

          // Bump XP and recompute level (parity with applyRewards / gacha).
          const { xpBefore, levelBefore } = await this.#creditGainsAndLevel(
            tx,
            userId,
            { gold: totalGold, dust: totalDust, xp: totalXp },
            {
              base: sweepCfg['xp.base'],
              slope: sweepCfg['xp.slope'],
              levelCap: sweepCfg['xp.levelCap'],
            },
            sweepCfg['levelup.refillEnergy'],
            effects,
          )

          return {
            runs,
            totalGold,
            totalDust,
            totalXp,
            xpBefore,
            levelBefore,
            equipmentDrops,
            cardDrops,
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

  /** Rejoue `runs` fois le butin de farm d'un étage déjà franchi. */
  async #runSweeps(
    tx: PrimaTransactionClient,
    userId: string,
    isBoss: boolean,
    loot: FarmLoot,
    runs: number,
    substatRanges: SubstatRanges,
  ): Promise<{
    totalGold: number
    totalDust: number
    totalXp: number
    equipmentDrops: EquipmentDropPayload[]
    cardDrops: CardDropPayload[]
  }> {
    let totalGold = 0
    let totalDust = 0
    let totalXp = 0
    const equipmentDrops: EquipmentDropPayload[] = []
    const cardDrops: CardDropPayload[] = []

    const { equipmentCatalog, activeCards } = await this.#loadSweepCatalogs(tx)

    for (let i = 0; i < runs; i++) {
      totalGold += loot.gold
      totalDust += loot.dust
      totalXp += loot.xp

      const equipmentDrop = await this.#rollSweepEquipmentDrop(
        tx,
        userId,
        loot,
        equipmentCatalog,
        substatRanges,
      )
      if (equipmentDrop) {
        equipmentDrops.push(equipmentDrop)
      }

      const cardDrop = await this.#rollSweepCardDrop(
        tx,
        userId,
        loot,
        activeCards,
      )
      if (cardDrop) {
        cardDrops.push(cardDrop)
      }

      await this.#achievementsDomain.track(tx, userId, {
        kind: 'STAGE_CLEARED',
        source: 'CAMPAIGN',
        isBoss,
        viaSweep: true,
        flawless: false,
        understaffed: false,
      })
    }
    return { totalGold, totalDust, totalXp, equipmentDrops, cardDrops }
  }

  async #applyRewards(
    tx: PrimaTransactionClient,
    userId: string,
    loot: LootTable,
    isFirstClear: boolean,
    xpBase: number,
    xpSlope: number,
    xpLevelCap: number,
    substatRanges: SubstatRanges,
    refillEnergy: number,
    effects: SkillEffects,
  ): Promise<BattleRewards> {
    const gains = isFirstClear ? loot.firstClear : loot.farm
    const { gold, dust, xp } = gains
    const { equipmentDrop, cardDrop } = isFirstClear
      ? await this.#grantFirstClearDrops(
          tx,
          userId,
          loot.firstClear,
          substatRanges,
        )
      : await this.#grantFarmDrops(tx, userId, loot.farm, substatRanges)

    // Increment XP, then recompute User.level so threshold crossings actually
    // bump the level (parity with gacha.domain). Without this, campaign XP
    // would never trigger level-ups or LEVEL_UP achievements.
    const { xpBefore, levelBefore } = await this.#creditGainsAndLevel(
      tx,
      userId,
      { gold, dust, xp },
      { base: xpBase, slope: xpSlope, levelCap: xpLevelCap },
      refillEnergy,
      effects,
    )

    return {
      gold,
      dust,
      xp,
      xpBefore,
      levelBefore,
      isFirstClear,
      equipmentDrop,
      cardDrop,
    }
  }

  async #grantFirstClearDrops(
    tx: PrimaTransactionClient,
    userId: string,
    fc: FirstClearLoot,
    substatRanges: SubstatRanges,
  ): Promise<Pick<BattleRewards, 'equipmentDrop' | 'cardDrop'>> {
    const equipmentDrop = fc.guaranteedEquipment
      ? await this.#grantGuaranteedEquipment(
          tx,
          userId,
          fc,
          fc.guaranteedEquipment.minRarity,
          substatRanges,
        )
      : null
    const cardDrop = fc.guaranteedCard
      ? await this.#grantGuaranteedCard(
          tx,
          userId,
          fc,
          fc.guaranteedCard.minRarity,
        )
      : null
    return { equipmentDrop, cardDrop }
  }

  // Guaranteed equipment — broaden to any rarity >= minRarity if the
  // rolled rarity has no candidates, so a partial catalog never silently
  // drops the promised drop.
  async #grantGuaranteedEquipment(
    tx: PrimaTransactionClient,
    userId: string,
    fc: FirstClearLoot,
    guaranteedMinRarity: Rarity | undefined,
    substatRanges: SubstatRanges,
  ): Promise<EquipmentDropPayload | null> {
    const fcEquipRarity = rollFirstClearEquipmentRarity(fc, Math.random)
    const allowedRarities = raritiesFrom(
      guaranteedMinRarity ?? fcEquipRarity ?? 'COMMON',
    )
    const catalogRaw = await tx.equipment.findMany({
      where: {
        rarity: { in: allowedRarities },
        slot: { in: [...CAMPAIGN_EQUIPMENT_SLOTS] },
      },
      select: EQUIPMENT_CATALOG_SELECT,
    })
    const catalog = catalogRaw.map(toEquipmentCatalogEntry)
    // Prefer the rolled rarity; fall back to any allowed rarity if empty.
    let picked = fcEquipRarity
      ? pickEquipmentForRarity(catalog, fcEquipRarity, Math.random)
      : null
    if (!picked && catalog.length > 0) {
      picked = this.#pickWeighted(catalog, Math.random)
    }
    if (!picked) {
      return null
    }
    return this.#createEquipmentDrop(
      tx,
      userId,
      picked,
      picked.rarity,
      substatRanges,
    )
  }

  // Guaranteed card — same fallback.
  async #grantGuaranteedCard(
    tx: PrimaTransactionClient,
    userId: string,
    fc: FirstClearLoot,
    guaranteedMinRarity: Rarity | undefined,
  ): Promise<CardDropPayload | null> {
    const fcCardRarity = rollFirstClearCardRarity(fc, Math.random)
    const allowedRarities = raritiesFrom(
      guaranteedMinRarity ?? fcCardRarity ?? 'COMMON',
    )
    // Prefer the rolled rarity; fall back to any allowed.
    let cardsRaw = fcCardRarity
      ? await tx.card.findMany({
          where: { rarity: fcCardRarity, set: { isActive: true } },
          select: CARD_CATALOG_SELECT,
        })
      : []
    if (cardsRaw.length === 0) {
      cardsRaw = await tx.card.findMany({
        where: { rarity: { in: allowedRarities }, set: { isActive: true } },
        select: CARD_CATALOG_SELECT,
      })
    }
    const cards = cardsRaw.map(toCardCatalogEntry)
    // Repli sur la dernière carte si le tirage pondéré ne rend rien.
    // `picked` est undefined quand cards est vide : rien à octroyer.
    const picked =
      this.#pickWeighted(cards, Math.random) ?? cards[cards.length - 1]
    return picked ? this.#createCardDrop(tx, userId, picked) : null
  }

  async #grantFarmDrops(
    tx: PrimaTransactionClient,
    userId: string,
    farm: FarmLoot,
    substatRanges: SubstatRanges,
  ): Promise<Pick<BattleRewards, 'equipmentDrop' | 'cardDrop'>> {
    let equipmentDrop: BattleRewards['equipmentDrop'] = null
    const droppedRarity = rollFarmEquipmentDrop(farm, Math.random)
    if (droppedRarity) {
      const catalogRaw = await tx.equipment.findMany({
        where: {
          rarity: droppedRarity,
          slot: { in: [...CAMPAIGN_EQUIPMENT_SLOTS] },
        },
        select: EQUIPMENT_CATALOG_SELECT,
      })
      const picked = pickEquipmentForRarity(
        catalogRaw.map(toEquipmentCatalogEntry),
        droppedRarity,
        Math.random,
      )
      if (picked) {
        equipmentDrop = await this.#createEquipmentDrop(
          tx,
          userId,
          picked,
          droppedRarity,
          substatRanges,
        )
      }
    }

    let cardDrop: BattleRewards['cardDrop'] = null
    if (rollFarmCardDrop(farm, Math.random)) {
      const cardsRaw = await tx.card.findMany({
        where: { set: { isActive: true } },
        select: CARD_CATALOG_SELECT,
      })
      const picked = this.#pickWeighted(
        cardsRaw.map(toCardCatalogEntry),
        Math.random,
      )
      if (picked) {
        cardDrop = await this.#createCardDrop(tx, userId, picked)
      }
    }
    return { equipmentDrop, cardDrop }
  }

  async #createEquipmentDrop(
    tx: PrimaTransactionClient,
    userId: string,
    picked: EquipmentCatalogEntry,
    rarity: Rarity,
    substatRanges: SubstatRanges,
  ): Promise<EquipmentDropPayload> {
    const ue = await tx.userEquipment.create({
      data: {
        userId,
        equipmentId: picked.id,
        substats: rollInitialSubstats(
          INITIAL_SUBSTATS_BY_RARITY[rarity],
          substatRanges,
          Math.random,
        ) as unknown as Prisma.InputJsonValue,
      },
    })
    const drop: EquipmentDropPayload = {
      userEquipmentId: ue.id,
      equipmentId: picked.id,
      name: picked.name,
      rarity,
      slot: picked.slot,
      setKey: picked.setKey,
      level: ue.level,
      bonuses: picked.bonuses,
      substats: (ue.substats ?? []) as { key: string; value: number }[],
      baseBoost: ue.baseBoost,
    }
    await this.#achievementsDomain.track(tx, userId, {
      kind: 'EQUIPMENT_OBTAINED',
      equipmentId: picked.id,
      rarity,
    })
    return drop
  }

  async #createCardDrop(
    tx: PrimaTransactionClient,
    userId: string,
    picked: CardCatalogEntry,
  ): Promise<CardDropPayload> {
    const { wasDuplicate } = await this.#grantCard(tx, userId, picked.id)
    return {
      cardId: picked.id,
      name: picked.name,
      rarity: picked.rarity,
      wasDuplicate,
      imageUrl: picked.imageUrl
        ? this.#storageClient.publicUrl(picked.imageUrl)
        : null,
      element: picked.element,
      setName: picked.setName,
    }
  }

  /**
   * Crédite or/poussière/XP, recalcule le niveau et déclenche les effets de
   * montée de niveau (succès, paliers, recharge d'énergie). Partagé par le
   * combat unique et le balayage. Rend l'état AVANT le crédit.
   */
  async #creditGainsAndLevel(
    tx: PrimaTransactionClient,
    userId: string,
    gains: { gold: number; dust: number; xp: number },
    xpCurve: { base: number; slope: number; levelCap: number },
    refillEnergy: number,
    effects: SkillEffects,
  ): Promise<{ xpBefore: number; levelBefore: number }> {
    const userBefore = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    })
    const oldLevel = userBefore?.level ?? 1
    const newXp = (userBefore?.xp ?? 0) + gains.xp
    const newLevel = levelAfterXpGain(
      oldLevel,
      newXp,
      xpCurve.base,
      xpCurve.slope,
      xpCurve.levelCap,
    )
    const gained = skillPointsGained(oldLevel, newLevel)
    await tx.user.update({
      where: { id: userId },
      data: {
        gold: { increment: gains.gold },
        dust: { increment: gains.dust },
        dustGenerated: { increment: gains.dust },
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

  async #resolveStageAccess(
    tx: PrimaTransactionClient,
    stage: StagePosition,
    progress: CampaignProgress,
  ): Promise<StageAccess> {
    const isAlreadyCleared = isStageCleared(stage, progress)
    const isCurrent =
      stage.chapter === progress.highestChapter &&
      stage.index === progress.highestIndex + 1
    // Cross-chapter unlock requires the previous chapter to be fully
    // cleared (i.e. highestIndex reached the last stage of that chapter,
    // which is the boss). Otherwise a player could clear stage 1-1 then
    // jump straight to 2-1, bypassing the boss gate.
    const isNewChapterFirst =
      stage.chapter === progress.highestChapter + 1 &&
      stage.index === 1 &&
      (await this.#isActiveChapterFullyCleared(tx, progress))
    if (!isAlreadyCleared && !isCurrent && !isNewChapterFirst) {
      throw Boom.forbidden(errorMessage('campaign.stageLocked'))
    }
    return { isAlreadyCleared, isCurrent, isNewChapterFirst }
  }

  async #isActiveChapterFullyCleared(
    tx: PrimaTransactionClient,
    progress: CampaignProgress,
  ): Promise<boolean> {
    const prevChapterMax = await tx.campaignStage.aggregate({
      where: { chapter: progress.highestChapter },
      _max: { index: true },
    })
    const prevMaxIndex = prevChapterMax._max.index ?? 0
    return prevMaxIndex > 0 && progress.highestIndex >= prevMaxIndex
  }

  async #advanceProgress(
    tx: PrimaTransactionClient,
    userId: string,
    stage: StagePosition,
    access: StageAccess,
  ): Promise<void> {
    if (access.isNewChapterFirst) {
      await tx.userCampaignProgress.update({
        where: { userId },
        data: { highestChapter: stage.chapter, highestIndex: stage.index },
      })
    } else if (access.isCurrent) {
      await tx.userCampaignProgress.update({
        where: { userId },
        data: { highestIndex: stage.index },
      })
    }
  }

  // Catalog snapshots used to pick drops. La campagne ne droppe que les slots
  // classiques : les slots de tour (AMULET/GLOVES/BOOTS/BELT) sont
  // l'exclusivité des tours (§5/§6 design spec).
  async #loadSweepCatalogs(tx: PrimaTransactionClient): Promise<{
    equipmentCatalog: EquipmentCatalogEntry[]
    activeCards: CardCatalogEntry[]
  }> {
    const equipmentCatalogRaw = await tx.equipment.findMany({
      where: { slot: { in: [...CAMPAIGN_EQUIPMENT_SLOTS] } },
      select: EQUIPMENT_CATALOG_SELECT,
    })
    const activeCardsRaw = await tx.card.findMany({
      where: { set: { isActive: true } },
      select: CARD_CATALOG_SELECT,
    })
    return {
      equipmentCatalog: equipmentCatalogRaw.map(toEquipmentCatalogEntry),
      activeCards: activeCardsRaw.map(toCardCatalogEntry),
    }
  }

  async #rollSweepEquipmentDrop(
    tx: PrimaTransactionClient,
    userId: string,
    loot: FarmLoot,
    catalog: EquipmentCatalogEntry[],
    substatRanges: SubstatRanges,
  ): Promise<EquipmentDropPayload | null> {
    const droppedRarity = rollFarmEquipmentDrop(loot, Math.random)
    if (!droppedRarity) {
      return null
    }
    const candidate = pickEquipmentForRarity(
      catalog,
      droppedRarity,
      Math.random,
    )
    if (!candidate) {
      return null
    }
    return await this.#createEquipmentDrop(
      tx,
      userId,
      candidate,
      droppedRarity,
      substatRanges,
    )
  }

  async #rollSweepCardDrop(
    tx: PrimaTransactionClient,
    userId: string,
    loot: FarmLoot,
    activeCards: CardCatalogEntry[],
  ): Promise<CardDropPayload | null> {
    if (!rollFarmCardDrop(loot, Math.random) || activeCards.length === 0) {
      return null
    }
    const picked = this.#pickWeighted(activeCards, Math.random)
    return picked ? await this.#createCardDrop(tx, userId, picked) : null
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

  // Résout l'apparence d'un ennemi en URL publique MinIO (préfixe env comme les
  // cartes), ou null si pas d'apparence. Partagé aperçu d'étage / combat.
  #resolveEnemyImage(appearance: string | null | undefined): string | null {
    return resolveEnemyImageUrl(
      appearance,
      (key) => this.#storageClient.publicUrl(key),
      this.#config.isDevelopment ? 'staging/' : '',
    )
  }

  #buildEnemySimUnits(
    enemyTeam: EnemySpec[],
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
        // Le seed peut surcharger une stat de stuff par ennemi (ex. boss
        // « bourreau » à 40 % de critRate) ; sinon valeur de base commune.
        baseStats: {
          critRate: e.critRate ?? baseStats.critRate,
          critDmg: e.critDmg ?? baseStats.critDmg,
          armorPen: e.armorPen ?? baseStats.armorPen,
          lifesteal: e.lifesteal ?? baseStats.lifesteal,
        },
      })
      return {
        id: `B${idx}`,
        name:
          enemyNameFromAppearance(e.appearance) ?? genericEnemyName(idx + 1),
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

  #getOrCreateProgress(userId: string) {
    return this.#postgresOrm.prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }
}
