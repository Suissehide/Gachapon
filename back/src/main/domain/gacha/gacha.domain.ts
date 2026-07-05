import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import type {
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
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { IUserCardRepository } from '../../types/infra/orm/repositories/user-card.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import { calculateTokens } from '../economy/economy.domain'
import { milestonesCrossed, skillPointsGained } from '../shared/level-rewards'
import { calculateLevel } from '../shared/xp'

export function pickWeightedRandom(cards: CardWithSet[]): CardWithSet {
  if (cards.length === 0) {
    throw new Error('No cards to pick from')
  }
  const total = cards.reduce((sum, c) => sum + c.dropWeight, 0)
  if (total === 0) {
    throw new Error('All cards have zero weight')
  }
  let roll = Math.random() * total
  for (const card of cards) {
    roll -= card.dropWeight
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
): CardWithSet {
  if (cards.length === 0) {
    throw new Error('No cards to pick from')
  }
  const LUCK_RARITIES = new Set(['RARE', 'EPIC', 'LEGENDARY'])
  const weighted = cards.map((card) => ({
    card,
    weight: LUCK_RARITIES.has(card.rarity)
      ? card.dropWeight * luckMultiplier
      : card.dropWeight,
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

export function pickVariant(rarity: string, rates: VariantRates, variantLuckMultiplier = 1): CardVariant {
  if (!(VARIANT_ELIGIBLE as readonly string[]).includes(rarity)) {
    return 'NORMAL' as CardVariant
  }
  const key = rarityKey(rarity as VariantEligibleRarity)
  const brilliantRate = (rates[`brilliantRate${key}`] ?? 0) * variantLuckMultiplier
  const holoRate = (rates[`holoRate${key}`] ?? 0) * variantLuckMultiplier
  const roll = Math.random() * 100
  if (roll < brilliantRate) {
    return 'BRILLIANT' as CardVariant
  }
  if (roll < brilliantRate + holoRate) {
    return 'HOLOGRAPHIC' as CardVariant
  }
  return 'NORMAL' as CardVariant
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
}

type StepOutcome = {
  pull: Awaited<ReturnType<IGachaPullRepository['createInTx']>>
  card: CardWithSet
  wasDuplicate: boolean
  dustEarned: number
  unlockedAchievements: Awaited<ReturnType<AchievementsDomainInterface['track']>>
  nextPity: number
  wasGoldenBall: boolean
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
  }

  async #loadUserAndInitialState(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: PullCfg,
  ): Promise<{
    user: Awaited<ReturnType<UserRepositoryInterface['findByIdOrThrowInTx']>>
    state: { currentTokens: number; currentPity: number; newLastTokenAt: Date | null }
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

  async #executeSinglePullStep(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: PullCfg,
    stepState: { currentTokens: number; currentPity: number },
  ): Promise<{
    pull: Awaited<ReturnType<IGachaPullRepository['createInTx']>>
    card: CardWithSet
    wasDuplicate: boolean
    dustEarned: number
    unlockedAchievements: Awaited<ReturnType<AchievementsDomainInterface['track']>>
    nextPity: number
    wasGoldenBall: boolean
  }> {
    const effectivePityThreshold = Math.max(10, cfg.pityThreshold - (cfg.upgrades.pityReduction ?? 0))
    const isPityForced = stepState.currentPity >= effectivePityThreshold
    let activeCards = await this.#cardRepository.findActiveForPullInTx(tx, isPityForced)
    if (activeCards.length === 0) {
      throw Boom.internal('No active cards in any set')
    }
    const goldenBallChance = cfg.upgrades.goldenBallChance ?? 0
    const isGolden = !isPityForced && Math.random() < goldenBallChance / 100
    if (isGolden) {
      const GOLDEN_RARITIES = new Set(['RARE', 'EPIC', 'LEGENDARY'])
      const filtered = activeCards.filter((c) => GOLDEN_RARITIES.has(c.rarity))
      if (filtered.length > 0) {
        activeCards = filtered
      }
    }
    const card =
      cfg.upgrades.luckMultiplier === 1.0
        ? pickWeightedRandom(activeCards)
        : pickWeightedRandomWithLuck(activeCards, cfg.upgrades.luckMultiplier)
    const variantLuckMultiplier = cfg.upgrades.variantLuckMultiplier ?? 1
    const rolledVariant = pickVariant(card.rarity, cfg.variantRates, variantLuckMultiplier)
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
    })
    return {
      pull,
      card,
      wasDuplicate,
      dustEarned,
      unlockedAchievements: pullUnlocks,
      nextPity,
      wasGoldenBall: isGolden,
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
    const step = await this.#executeSinglePullStep(tx, userId, cfg, state)
    const totalXp = Math.round(cfg.xpPerPull * (1 + (cfg.upgrades.pullXpBonus ?? 0) / 100))
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
    const finalTokens = state.currentTokens - (isFreePull ? 0 : cfg.pullTokenCost)
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
        : Promise.resolve([] as Awaited<ReturnType<AchievementsDomainInterface['track']>>),
      newLevel > oldLevel
        ? this.#achievementsDomain.track(tx, userId, {
            kind: 'LEVEL_UP',
            newLevel,
          })
        : Promise.resolve([] as Awaited<
            ReturnType<AchievementsDomainInterface['track']>
          >),
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

  pullBatch(userId: string, count: 1 | 10): Promise<PullBatchResult> {
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
      }
      return this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: milestone loop added, refactor deferred
        async (tx) => {
          const { user, state } = await this.#loadUserAndInitialState(tx, userId, cfg)
          if (state.currentTokens < count * cfg.pullTokenCost) {
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
          const xpPerPullBonused = Math.round(cfg.xpPerPull * (1 + (cfg.upgrades.pullXpBonus ?? 0) / 100))
          const totalXp = xpPerPullBonused * count
          const pullUnlocks: Awaited<ReturnType<AchievementsDomainInterface['track']>> = []
          for (let i = 0; i < count; i++) {
            const isFreePull = Math.random() < (cfg.upgrades.freePullChance ?? 0) / 100
            stepFreePulls.push(isFreePull)
            totalActualCost += isFreePull ? 0 : cfg.pullTokenCost
            const step = await this.#executeSinglePullStep(tx, userId, cfg, {
              currentTokens: state.currentTokens - totalActualCost,
              currentPity,
            })
            stepResults.push(step)
            currentPity = step.nextPity
            totalDust += step.dustEarned
            pullUnlocks.push(...step.unlockedAchievements)
          }
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
              : Promise.resolve([] as Awaited<ReturnType<AchievementsDomainInterface['track']>>),
            newLevel > oldLevel
              ? this.#achievementsDomain.track(tx, userId, {
                  kind: 'LEVEL_UP',
                  newLevel,
                })
              : Promise.resolve([] as Awaited<ReturnType<AchievementsDomainInterface['track']>>),
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
          }
          const dedupedAchievements = [
            ...new Map(
              [...pullUnlocks, ...spentUnlocks, ...levelUnlocks].map((a) => [a.key, a]),
            ).values(),
          ]
          return {
            pulls: stepResults.map((s, idx) => ({
              pull: s.pull,
              card: s.card,
              wasDuplicate: s.wasDuplicate,
              dustEarned: s.dustEarned,
              pityCurrent: s.nextPity,
              wasFreePull: stepFreePulls[idx] ?? false,
              wasGoldenBall: s.wasGoldenBall,
            })),
            tokensRemaining: finalTokens,
            xpGained: totalXp,
            unlockedAchievements: dedupedAchievements,
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
