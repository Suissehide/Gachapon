import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import type {
  CardRarity,
  CardVariant,
  CardWithSet,
  PullBatchResult,
  PullResult,
} from '../../types/domain/gacha/gacha.types'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { IGachaPullRepository } from '../../types/infra/orm/repositories/gacha-pull.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { IUserBoostRepository } from '../../types/infra/orm/repositories/user-boost.repository.interface'
import type { IUserCardRepository } from '../../types/infra/orm/repositories/user-card.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import { calculateTokens } from '../economy/economy.domain'
import { milestonesCrossed, skillPointsGained } from '../shared/level-rewards'
import { calculateLevel } from '../shared/xp'

// ---------------------------------------------------------------------------
// Boost weight helper (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Computes the effective draw weight for a card, applying luck and boost multipliers.
 *
 * Formula: dropWeight × (RARE+? luckMultiplier : 1) × Π(weightMultiplier des boosts dont la rareté matche)
 *
 * Null weightRarity is silently ignored (no multiplication, no crash).
 */
export function weightFor(
  card: CardWithSet,
  luckMultiplier: number,
  weightBoosts?: Array<{
    weightMultiplier: number
    weightRarity: CardRarity | null
  }>,
): number {
  const LUCK_RARITIES = new Set(['RARE', 'EPIC', 'LEGENDARY'])
  let weight = LUCK_RARITIES.has(card.rarity)
    ? card.dropWeight * luckMultiplier
    : card.dropWeight
  for (const boost of weightBoosts ?? []) {
    if (
      boost.weightRarity != null &&
      card.rarity === (boost.weightRarity as string)
    ) {
      weight *= boost.weightMultiplier
    }
  }
  return weight
}

export function pickWeightedRandom(
  cards: CardWithSet[],
  weightBoosts?: Array<{
    weightMultiplier: number
    weightRarity: CardRarity | null
  }>,
  luckMultiplier = 1.0,
): CardWithSet {
  if (cards.length === 0) {
    throw new Error('No cards to pick from')
  }
  const total = cards.reduce(
    (sum, c) => sum + weightFor(c, luckMultiplier, weightBoosts),
    0,
  )
  if (total === 0) {
    throw new Error('All cards have zero weight')
  }
  let roll = Math.random() * total
  for (const card of cards) {
    roll -= weightFor(card, luckMultiplier, weightBoosts)
    if (roll <= 0) {
      return card
    }
  }
  // biome-ignore lint/style/noNonNullAssertion: cards.length > 0 is guaranteed by the guard above
  return cards[cards.length - 1]!
}

export function pickWeightedRandomWithLuck(
  cards: CardWithSet[],
  luckMultiplier: number,
  weightBoosts?: Array<{
    weightMultiplier: number
    weightRarity: CardRarity | null
  }>,
): CardWithSet {
  if (cards.length === 0) {
    throw new Error('No cards to pick from')
  }
  const weighted = cards.map((card) => ({
    card,
    weight: weightFor(card, luckMultiplier, weightBoosts),
  }))
  const total = weighted.reduce((sum, { weight }) => sum + weight, 0)
  if (total === 0) {
    throw new Error('All cards have zero weight')
  }
  let roll = Math.random() * total
  for (const { card, weight } of weighted) {
    roll -= weight
    if (roll <= 0) {
      return card
    }
  }
  const last = weighted.at(-1)
  if (!last) {
    throw new Error('No cards to pick from')
  }
  return last.card
}

type VariantRates = {
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
}

const VARIANT_ELIGIBLE = ['RARE', 'EPIC', 'LEGENDARY'] as const
type VariantEligibleRarity = (typeof VARIANT_ELIGIBLE)[number]

function rarityKey(
  rarity: VariantEligibleRarity,
): 'Rare' | 'Epic' | 'Legendary' {
  const map = { RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary' } as const
  return map[rarity]
}

export function pickVariant(
  rarity: string,
  rates: VariantRates,
  variantLuckMultiplier = 1,
): CardVariant {
  if (!(VARIANT_ELIGIBLE as readonly string[]).includes(rarity)) {
    return 'NORMAL' as CardVariant
  }
  const key = rarityKey(rarity as VariantEligibleRarity)
  const brilliantRate =
    (rates[`brilliantRate${key}`] ?? 0) * variantLuckMultiplier
  const holoRate = (rates[`holoRate${key}`] ?? 0) * variantLuckMultiplier
  // Note: multiplied rates are not capped; combined brilliant+holo > 100 makes NORMAL unreachable by design
  // (les taux réels du jeu sont ≤ 5 % × 2 max, donc ce cas ne survient pas en pratique)
  const roll = Math.random() * 100
  if (roll < brilliantRate) {
    return 'BRILLIANT' as CardVariant
  }
  if (roll < brilliantRate + holoRate) {
    return 'HOLOGRAPHIC' as CardVariant
  }
  return 'NORMAL' as CardVariant
}

/** Seuil de pity effectif pour un utilisateur (réduction skill tree, plancher 10). */
export function effectivePityThreshold(
  pityThreshold: number,
  pityReduction = 0,
): number {
  return Math.max(10, pityThreshold - pityReduction)
}

function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  )
}

type PullCfg = {
  tokenRegenIntervalMinutes: number
  tokenMaxStock: number
  pityThreshold: number
  dustByRarity: Record<string, number>
  variantRates: VariantRates
  upgrades: UserUpgradeEffects
  xpPerPull: number
  pullTokenCost: number
  xpCurve: { base: number; slope: number; levelCap: number }
  refillEnergyOnLevelUp: boolean
}

// ---------------------------------------------------------------------------
// In-memory boost tracking (shared across steps in a batch)
// ---------------------------------------------------------------------------

type BoostState = {
  id: string
  weightMultiplier: number | null
  weightRarity: string | null
  guaranteedRarity: string | null
  pullsRemaining: number
  satisfied: boolean
  /** Number of pulls consumed so far — used to persist a single bulk decrement. */
  pullsConsumed: number
}

const RARITY_ORDER: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
}

function rarityGte(a: string, b: string): boolean {
  return (RARITY_ORDER[a] ?? -1) >= (RARITY_ORDER[b] ?? -1)
}

type StepOutcome = {
  pull: Awaited<ReturnType<IGachaPullRepository['createInTx']>>
  card: CardWithSet
  wasDuplicate: boolean
  dustEarned: number
  unlockedAchievements: Awaited<
    ReturnType<AchievementsDomainInterface['track']>
  >
  nextPity: number
  wasGoldenBall: boolean
  wasBoostGuarantee: boolean
}

export class GachaDomain implements GachaDomainInterface {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #userRepository: UserRepositoryInterface
  readonly #cardRepository: ICardRepository
  readonly #userCardRepository: IUserCardRepository
  readonly #gachaPullRepository: IGachaPullRepository
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #userBoostRepository: IUserBoostRepository
  readonly #combatPointsTx: IocContainer['combatPointsTx']

  constructor({
    postgresOrm,
    configService,
    userRepository,
    cardRepository,
    userCardRepository,
    gachaPullRepository,
    skillTreeRepository,
    achievementsDomain,
    userRewardRepository,
    userBoostRepository,
    combatPointsTx,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#userRepository = userRepository
    this.#cardRepository = cardRepository
    this.#userCardRepository = userCardRepository
    this.#gachaPullRepository = gachaPullRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#achievementsDomain = achievementsDomain
    this.#userRewardRepository = userRewardRepository
    this.#userBoostRepository = userBoostRepository
    this.#combatPointsTx = combatPointsTx
  }

  async #loadUserAndInitialState(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: PullCfg,
  ): Promise<{
    user: Awaited<ReturnType<UserRepositoryInterface['findByIdOrThrowInTx']>>
    state: {
      currentTokens: number
      currentPity: number
      newLastTokenAt: Date | null
    }
  }> {
    const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
    const effectiveInterval = Math.max(
      1,
      cfg.tokenRegenIntervalMinutes - cfg.upgrades.regenReductionMinutes,
    )
    const effectiveMaxStock = cfg.tokenMaxStock + cfg.upgrades.tokenVaultBonus
    const { tokens, newLastTokenAt } = calculateTokens(
      user.lastTokenAt,
      user.tokens,
      effectiveInterval,
      effectiveMaxStock,
      cfg.upgrades.multiTokenChance,
    )
    return {
      user,
      state: {
        currentTokens: tokens,
        currentPity: user.pityCurrent,
        newLastTokenAt,
      },
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: boost + pity + golden-ball precedence logic, refactor deferred
  async #executeSinglePullStep(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: PullCfg,
    stepState: { currentTokens: number; currentPity: number },
    boosts: BoostState[],
  ): Promise<StepOutcome> {
    const pityThreshold = effectivePityThreshold(
      cfg.pityThreshold,
      cfg.upgrades.pityReduction ?? 0,
    )
    const isPityForced = stepState.currentPity >= pityThreshold
    let activeCards = await this.#cardRepository.findActiveForPullInTx(
      tx,
      isPityForced,
    )
    if (activeCards.length === 0) {
      throw Boom.internal('No active cards in any set')
    }

    let wasBoostGuarantee = false

    const goldenBallChance = cfg.upgrades.goldenBallChance ?? 0
    // Roll golden ball before guarantee check (short-circuit: not rolled when pity fires)
    const isGolden = !isPityForced && Math.random() < goldenBallChance / 100

    if (!isPityForced) {
      // Guarantee boost fires only on the LAST pull (pullsRemaining === 1) when unsatisfied.
      // Precedence: guarantee > golden ball.
      const guaranteeBoost = boosts.find(
        (b) =>
          b.guaranteedRarity != null && !b.satisfied && b.pullsRemaining === 1,
      )
      if (guaranteeBoost) {
        const GUARANTEE_RARITIES = new Set(['EPIC', 'LEGENDARY'])
        const filtered = activeCards.filter((c) =>
          GUARANTEE_RARITIES.has(c.rarity),
        )
        if (filtered.length > 0) {
          activeCards = filtered
          wasBoostGuarantee = true
        }
        // else: fallback to unfiltered list (existing pattern)
      } else if (isGolden) {
        const GOLDEN_RARITIES = new Set(['RARE', 'EPIC', 'LEGENDARY'])
        const filtered = activeCards.filter((c) =>
          GOLDEN_RARITIES.has(c.rarity),
        )
        if (filtered.length > 0) {
          activeCards = filtered
        }
      }
    }

    // Weight boosts: apply every active boost to its rarity (null ignored defensively)
    const weightBoostArgs = boosts
      .filter(
        (b) =>
          b.weightMultiplier != null &&
          b.weightRarity != null &&
          b.pullsRemaining > 0,
      )
      .map((b) => ({
        weightMultiplier: b.weightMultiplier!,
        weightRarity: b.weightRarity as CardRarity,
      }))
    const weightBoostArg =
      weightBoostArgs.length > 0 ? weightBoostArgs : undefined

    const card =
      cfg.upgrades.luckMultiplier === 1.0
        ? pickWeightedRandom(activeCards, weightBoostArg)
        : pickWeightedRandomWithLuck(
            activeCards,
            cfg.upgrades.luckMultiplier,
            weightBoostArg,
          )

    // Update boost states in memory (decrement all active boosts, set satisfied on guarantee)
    for (const boost of boosts) {
      if (boost.pullsRemaining > 0) {
        boost.pullsRemaining -= 1
        boost.pullsConsumed += 1
        if (
          boost.guaranteedRarity != null &&
          !boost.satisfied &&
          rarityGte(card.rarity, boost.guaranteedRarity)
        ) {
          boost.satisfied = true
        }
      }
    }

    const variantLuckMultiplier = cfg.upgrades.variantLuckMultiplier ?? 1
    const rolledVariant = pickVariant(
      card.rarity,
      cfg.variantRates,
      variantLuckMultiplier,
    )
    const { wasDuplicate } = await this.#userCardRepository.upsertInTx(
      tx,
      userId,
      card.id,
      rolledVariant,
    )
    const dustEarned = 0
    const pull = await this.#gachaPullRepository.createInTx(tx, {
      userId,
      cardId: card.id,
      variant: rolledVariant,
      wasDuplicate,
      dustEarned,
    })
    const isLegendary = card.rarity === 'LEGENDARY'
    const nextPity = isLegendary ? 0 : stepState.currentPity + 1
    const pullUnlocks = await this.#achievementsDomain.track(tx, userId, {
      kind: 'PULL_COMPLETED',
      cardId: card.id,
      rarity: card.rarity,
      variant: rolledVariant,
      wasDuplicate,
    })
    return {
      pull,
      card,
      wasDuplicate,
      dustEarned,
      unlockedAchievements: pullUnlocks,
      nextPity,
      wasGoldenBall: isGolden,
      wasBoostGuarantee,
    }
  }

  async #writeFinalUserUpdate(
    tx: PrimaTransactionClient,
    userId: string,
    finalTokens: number,
    totalDust: number,
    totalXp: number,
    newLevel: number,
    finalPity: number,
    newLastTokenAt: Date | null,
    skillPointsIncrement?: number,
  ): Promise<void> {
    await this.#userRepository.updateAfterPullInTx(tx, userId, {
      tokens: finalTokens,
      dustIncrement: totalDust,
      xpIncrement: totalXp,
      newLevel,
      pityCurrent: finalPity,
      lastTokenAt: newLastTokenAt,
      skillPointsIncrement,
    })
  }

  async #persistBoostDecrements(
    tx: PrimaTransactionClient,
    boosts: BoostState[],
  ): Promise<void> {
    for (const boost of boosts) {
      if (boost.pullsConsumed > 0) {
        await this.#userBoostRepository.decrementInTx(tx, boost.id, {
          by: boost.pullsConsumed,
          ...(boost.satisfied ? { satisfied: true } : {}),
        })
      }
    }
  }

  async #executePullTx(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: PullCfg,
  ): Promise<PullResult> {
    const { user, state } = await this.#loadUserAndInitialState(tx, userId, cfg)
    const isFreePull = Math.random() < (cfg.upgrades.freePullChance ?? 0) / 100
    if (!isFreePull && state.currentTokens < cfg.pullTokenCost) {
      throw Boom.paymentRequired('Not enough tokens')
    }

    // Load boosts in TX at step start (single-pull path)
    const rawBoosts = await this.#userBoostRepository.findActiveByUserInTx(
      tx,
      userId,
    )
    const boosts: BoostState[] = rawBoosts.map((b) => ({
      id: b.id,
      weightMultiplier: b.weightMultiplier,
      weightRarity: b.weightRarity,
      guaranteedRarity: b.guaranteedRarity,
      pullsRemaining: b.pullsRemaining,
      satisfied: b.satisfied,
      pullsConsumed: 0,
    }))

    const step = await this.#executeSinglePullStep(
      tx,
      userId,
      cfg,
      state,
      boosts,
    )

    // Persist boost decrements immediately after the single pull
    await this.#persistBoostDecrements(tx, boosts)

    const totalXp = Math.round(
      cfg.xpPerPull * (1 + (cfg.upgrades.pullXpBonus ?? 0) / 100),
    )
    const oldLevel = calculateLevel(
      user.xp,
      cfg.xpCurve.base,
      cfg.xpCurve.slope,
      cfg.xpCurve.levelCap,
    )
    const newLevel = calculateLevel(
      user.xp + totalXp,
      cfg.xpCurve.base,
      cfg.xpCurve.slope,
      cfg.xpCurve.levelCap,
    )
    const finalTokens =
      state.currentTokens - (isFreePull ? 0 : cfg.pullTokenCost)
    const gained = skillPointsGained(oldLevel, newLevel)
    await this.#writeFinalUserUpdate(
      tx,
      userId,
      finalTokens,
      step.dustEarned,
      totalXp,
      newLevel,
      step.nextPity,
      state.newLastTokenAt,
      gained > 0 ? gained : undefined,
    )
    const spentAmount = isFreePull ? 0 : cfg.pullTokenCost
    const [spentUnlocks, levelUnlocks] = await Promise.all([
      spentAmount > 0
        ? this.#achievementsDomain.track(tx, userId, {
            kind: 'TOKENS_SPENT',
            amount: spentAmount,
          })
        : Promise.resolve(
            [] as Awaited<ReturnType<AchievementsDomainInterface['track']>>,
          ),
      newLevel > oldLevel
        ? this.#achievementsDomain.track(tx, userId, {
            kind: 'LEVEL_UP',
            newLevel,
          })
        : Promise.resolve(
            [] as Awaited<ReturnType<AchievementsDomainInterface['track']>>,
          ),
    ])
    if (newLevel > oldLevel) {
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
      if (cfg.refillEnergyOnLevelUp) {
        await this.#combatPointsTx.refillToMaxInTx(tx, userId, cfg.upgrades)
      }
    }
    return {
      pull: step.pull,
      card: step.card,
      wasDuplicate: step.wasDuplicate,
      dustEarned: step.dustEarned,
      tokensRemaining: finalTokens,
      pityCurrent: step.nextPity,
      xpGained: totalXp,
      unlockedAchievements: [
        ...step.unlockedAchievements,
        ...spentUnlocks,
        ...levelUnlocks,
      ],
      wasFreePull: isFreePull,
      wasGoldenBall: step.wasGoldenBall,
      wasBoostGuarantee: step.wasBoostGuarantee,
      leveledUp:
        newLevel > oldLevel ? { from: oldLevel, to: newLevel } : undefined,
    }
  }

  pull(userId: string): Promise<PullResult> {
    const attempt = async (): Promise<PullResult> => {
      // Lire la config AVANT la transaction (pas d'I/O async dans le tx serializable)
      const [c, upgrades] = await Promise.all([
        this.#configService.getMany(
          'tokenRegenIntervalMinutes',
          'tokenMaxStock',
          'pityThreshold',
          'dustCommon',
          'dustUncommon',
          'dustRare',
          'dustEpic',
          'dustLegendary',
          'brilliantRateRare',
          'brilliantRateEpic',
          'brilliantRateLegendary',
          'holoRateRare',
          'holoRateEpic',
          'holoRateLegendary',
          'xpPerPull',
          'gacha.pullTokenCost',
          'xp.base',
          'xp.slope',
          'xp.levelCap',
          'levelup.refillEnergy',
        ),
        this.#skillTreeRepository.getEffectsForUser(userId),
      ])
      const cfg: PullCfg = {
        tokenRegenIntervalMinutes: c.tokenRegenIntervalMinutes,
        tokenMaxStock: c.tokenMaxStock,
        pityThreshold: c.pityThreshold,
        dustByRarity: {
          COMMON: c.dustCommon,
          UNCOMMON: c.dustUncommon,
          RARE: c.dustRare,
          EPIC: c.dustEpic,
          LEGENDARY: c.dustLegendary,
        },
        variantRates: {
          brilliantRateRare: c.brilliantRateRare,
          brilliantRateEpic: c.brilliantRateEpic,
          brilliantRateLegendary: c.brilliantRateLegendary,
          holoRateRare: c.holoRateRare,
          holoRateEpic: c.holoRateEpic,
          holoRateLegendary: c.holoRateLegendary,
        },
        xpPerPull: c.xpPerPull,
        pullTokenCost: c['gacha.pullTokenCost'],
        xpCurve: {
          base: c['xp.base'],
          slope: c['xp.slope'],
          levelCap: c['xp.levelCap'],
        },
        upgrades,
        refillEnergyOnLevelUp: c['levelup.refillEnergy'] === 1,
      }
      return this.#postgresOrm.executeWithTransactionClient(
        (tx) => this.#executePullTx(tx, userId, cfg),
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )
    }

    const MAX_RETRIES = 3
    const run = async (retriesLeft: number): Promise<PullResult> => {
      try {
        return await attempt()
      } catch (err: unknown) {
        if (retriesLeft > 0 && isPrismaSerializationError(err)) {
          return run(retriesLeft - 1)
        }
        throw err
      }
    }

    return run(MAX_RETRIES)
  }

  pullBatch(userId: string, count: number): Promise<PullBatchResult> {
    const attempt = async (): Promise<PullBatchResult> => {
      const [c, upgrades] = await Promise.all([
        this.#configService.getMany(
          'tokenRegenIntervalMinutes',
          'tokenMaxStock',
          'pityThreshold',
          'dustCommon',
          'dustUncommon',
          'dustRare',
          'dustEpic',
          'dustLegendary',
          'brilliantRateRare',
          'brilliantRateEpic',
          'brilliantRateLegendary',
          'holoRateRare',
          'holoRateEpic',
          'holoRateLegendary',
          'xpPerPull',
          'gacha.pullTokenCost',
          'xp.base',
          'xp.slope',
          'xp.levelCap',
          'levelup.refillEnergy',
        ),
        this.#skillTreeRepository.getEffectsForUser(userId),
      ])
      const cfg: PullCfg = {
        tokenRegenIntervalMinutes: c.tokenRegenIntervalMinutes,
        tokenMaxStock: c.tokenMaxStock,
        pityThreshold: c.pityThreshold,
        dustByRarity: {
          COMMON: c.dustCommon,
          UNCOMMON: c.dustUncommon,
          RARE: c.dustRare,
          EPIC: c.dustEpic,
          LEGENDARY: c.dustLegendary,
        },
        variantRates: {
          brilliantRateRare: c.brilliantRateRare,
          brilliantRateEpic: c.brilliantRateEpic,
          brilliantRateLegendary: c.brilliantRateLegendary,
          holoRateRare: c.holoRateRare,
          holoRateEpic: c.holoRateEpic,
          holoRateLegendary: c.holoRateLegendary,
        },
        xpPerPull: c.xpPerPull,
        pullTokenCost: c['gacha.pullTokenCost'],
        xpCurve: {
          base: c['xp.base'],
          slope: c['xp.slope'],
          levelCap: c['xp.levelCap'],
        },
        upgrades,
        refillEnergyOnLevelUp: c['levelup.refillEnergy'] === 1,
      }
      return this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: milestone loop added, refactor deferred
        async (tx) => {
          const { user, state } = await this.#loadUserAndInitialState(
            tx,
            userId,
            cfg,
          )

          // Load boosts ONCE at batch start; track in memory across steps
          const rawBoosts =
            await this.#userBoostRepository.findActiveByUserInTx(tx, userId)
          const boosts: BoostState[] = rawBoosts.map((b) => ({
            id: b.id,
            weightMultiplier: b.weightMultiplier,
            weightRarity: b.weightRarity,
            guaranteedRarity: b.guaranteedRarity,
            pullsRemaining: b.pullsRemaining,
            satisfied: b.satisfied,
            pullsConsumed: 0,
          }))

          // Pre-roll free-pull outcomes for all pulls BEFORE the token guard so that
          // users with freePullChance > 0 get identical parity to the single-pull path.
          const preRolledFree = Array.from(
            { length: count },
            () => Math.random() < (cfg.upgrades.freePullChance ?? 0) / 100,
          )
          const paidCount = preRolledFree.filter((f) => !f).length
          if (state.currentTokens < paidCount * cfg.pullTokenCost) {
            throw Boom.paymentRequired('Not enough tokens')
          }
          const oldLevel = calculateLevel(
            user.xp,
            cfg.xpCurve.base,
            cfg.xpCurve.slope,
            cfg.xpCurve.levelCap,
          )
          const stepResults: StepOutcome[] = []
          const stepFreePulls: boolean[] = []
          let currentPity = state.currentPity
          let totalDust = 0
          let totalActualCost = 0
          const xpPerPullBonused = Math.round(
            cfg.xpPerPull * (1 + (cfg.upgrades.pullXpBonus ?? 0) / 100),
          )
          const totalXp = xpPerPullBonused * count
          const stepLeveledUp: Array<{ from: number; to: number } | undefined> =
            []
          let runningXp = user.xp
          for (let i = 0; i < count; i++) {
            const isFreePull = preRolledFree[i] ?? false
            stepFreePulls.push(isFreePull)
            totalActualCost += isFreePull ? 0 : cfg.pullTokenCost
            const step = await this.#executeSinglePullStep(
              tx,
              userId,
              cfg,
              {
                currentTokens: state.currentTokens - totalActualCost,
                currentPity,
              },
              boosts,
            )
            const levelBefore = calculateLevel(
              runningXp,
              cfg.xpCurve.base,
              cfg.xpCurve.slope,
              cfg.xpCurve.levelCap,
            )
            runningXp += xpPerPullBonused
            const levelAfter = calculateLevel(
              runningXp,
              cfg.xpCurve.base,
              cfg.xpCurve.slope,
              cfg.xpCurve.levelCap,
            )
            stepLeveledUp.push(
              levelAfter > levelBefore
                ? { from: levelBefore, to: levelAfter }
                : undefined,
            )
            stepResults.push(step)
            currentPity = step.nextPity
            totalDust += step.dustEarned
          }

          // Persist boost decrements ONCE at batch end (bulk decrement per boost)
          await this.#persistBoostDecrements(tx, boosts)

          const finalTokens = state.currentTokens - totalActualCost
          const newLevel = calculateLevel(
            user.xp + totalXp,
            cfg.xpCurve.base,
            cfg.xpCurve.slope,
            cfg.xpCurve.levelCap,
          )
          const batchGained = skillPointsGained(oldLevel, newLevel)
          await this.#writeFinalUserUpdate(
            tx,
            userId,
            finalTokens,
            totalDust,
            totalXp,
            newLevel,
            currentPity,
            state.newLastTokenAt,
            batchGained > 0 ? batchGained : undefined,
          )
          const [spentUnlocks, levelUnlocks] = await Promise.all([
            totalActualCost > 0
              ? this.#achievementsDomain.track(tx, userId, {
                  kind: 'TOKENS_SPENT',
                  amount: totalActualCost,
                })
              : Promise.resolve(
                  [] as Awaited<
                    ReturnType<AchievementsDomainInterface['track']>
                  >,
                ),
            newLevel > oldLevel
              ? this.#achievementsDomain.track(tx, userId, {
                  kind: 'LEVEL_UP',
                  newLevel,
                })
              : Promise.resolve(
                  [] as Awaited<
                    ReturnType<AchievementsDomainInterface['track']>
                  >,
                ),
          ])
          if (newLevel > oldLevel) {
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
            if (cfg.refillEnergyOnLevelUp) {
              await this.#combatPointsTx.refillToMaxInTx(
                tx,
                userId,
                cfg.upgrades,
              )
            }
          }
          // Top-level = uniquement les succès NON liés à une carte (dépense de
          // jetons, montée de niveau). Les succès PULL_COMPLETED sont rattachés
          // à leur carte ci-dessous. Dédupliqués par clé par sécurité.
          const batchAchievements = [
            ...new Map(
              [...spentUnlocks, ...levelUnlocks].map((a) => [a.key, a]),
            ).values(),
          ]
          const pullLevelUps = stepLeveledUp.filter(
            (l): l is { from: number; to: number } => l !== undefined,
          )
          const batchLeveledUp =
            pullLevelUps.length > 0
              ? {
                  from: Math.min(...pullLevelUps.map((l) => l.from)),
                  to: Math.max(...pullLevelUps.map((l) => l.to)),
                }
              : undefined
          return {
            pulls: stepResults.map((s, idx) => ({
              pull: s.pull,
              card: s.card,
              wasDuplicate: s.wasDuplicate,
              dustEarned: s.dustEarned,
              pityCurrent: s.nextPity,
              wasFreePull: stepFreePulls[idx] ?? false,
              wasGoldenBall: s.wasGoldenBall,
              wasBoostGuarantee: s.wasBoostGuarantee,
              unlockedAchievements: s.unlockedAchievements,
              leveledUp: stepLeveledUp[idx],
            })),
            tokensRemaining: finalTokens,
            xpGained: totalXp,
            unlockedAchievements: batchAchievements,
            leveledUp: batchLeveledUp,
          }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )
    }

    const MAX_RETRIES = 3
    const run = async (retriesLeft: number): Promise<PullBatchResult> => {
      try {
        return await attempt()
      } catch (err: unknown) {
        if (retriesLeft > 0 && isPrismaSerializationError(err)) {
          return run(retriesLeft - 1)
        }
        throw err
      }
    }
    return run(MAX_RETRIES)
  }
}
