import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'

import type { UserReward } from '../../../generated/client'
import type { CardRarity, CardVariant } from '../../../generated/enums'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  AddRewardInput,
  ClaimedCard,
  ClaimResult,
  RewardsDomainInterface,
} from '../../types/domain/rewards/rewards.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { IUserCardRepository } from '../../types/infra/orm/repositories/user-card.repository.interface'
import type {
  PendingUserReward,
  UserRewardRepositoryInterface,
  UserRewardWithReward,
} from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { UnlockedAchievement } from '../achievements/events.types'
import { calculateTokens } from '../economy/economy.domain'
import { milestonesCrossed, skillPointsGained } from '../shared/level-rewards'
import { calculateLevel } from '../shared/xp'

export class RewardsDomain implements RewardsDomainInterface {
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #cardRepository: ICardRepository
  readonly #userCardRepository: IUserCardRepository

  constructor({
    userRewardRepository,
    userRepository,
    postgresOrm,
    configService,
    skillTreeRepository,
    achievementsDomain,
    cardRepository,
    userCardRepository,
  }: Pick<
    IocContainer,
    | 'userRewardRepository'
    | 'userRepository'
    | 'postgresOrm'
    | 'configService'
    | 'skillTreeRepository'
    | 'achievementsDomain'
    | 'cardRepository'
    | 'userCardRepository'
  >) {
    this.#userRewardRepository = userRewardRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
    this.#achievementsDomain = achievementsDomain
    this.#cardRepository = cardRepository
    this.#userCardRepository = userCardRepository
  }

  /** Grants a random active card of the given rarity (NORMAL variant) when a
   *  reward carries a `cardRarity`. Returns the granted card for the reveal, or
   *  null when the catalog has no active card of that rarity. */
  async #grantCardReward(
    tx: PrimaTransactionClient,
    userId: string,
    rarity: CardRarity,
  ): Promise<ClaimedCard | null> {
    const cards = await this.#cardRepository.findActiveByRarityInTx(tx, rarity)
    const picked = cards[Math.floor(Math.random() * cards.length)]
    if (!picked) {
      return null
    }
    const variant = 'NORMAL' as CardVariant
    const { wasDuplicate } = await this.#userCardRepository.upsertInTx(
      tx,
      userId,
      picked.id,
      variant,
    )
    return {
      card: {
        id: picked.id,
        name: picked.name,
        imageUrl: picked.imageUrl,
        rarity: picked.rarity,
        variant,
        set: { id: picked.set.id, name: picked.set.name },
      },
      wasDuplicate,
    }
  }

  /** Grants a card for each reward that carries a `cardRarity`, skipping the
   *  rest. Returns the granted cards (in reward order) for the claim reveal. */
  async #grantCardRewards(
    tx: PrimaTransactionClient,
    userId: string,
    rewards: Array<{ cardRarity: CardRarity | null }>,
  ): Promise<ClaimedCard[]> {
    const granted: ClaimedCard[] = []
    for (const reward of rewards) {
      if (!reward.cardRarity) {
        continue
      }
      const card = await this.#grantCardReward(tx, userId, reward.cardRarity)
      if (card) {
        granted.push(card)
      }
    }
    return granted
  }

  getPending(userId: string): Promise<PendingUserReward[]> {
    return this.#userRewardRepository.findPendingByUser(userId)
  }

  getHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: UserRewardWithReward[]; total: number }> {
    const safeLimit = Math.min(limit, 100)
    return this.#userRewardRepository.findHistoryByUser(userId, page, safeLimit)
  }

  async claimOne(rewardId: string, userId: string): Promise<ClaimResult> {
    // Pre-check: clean 404/409 for happy path before opening tx
    const preCheck = await this.#userRewardRepository.findByIdAndUser(
      rewardId,
      userId,
    )
    if (!preCheck) {
      throw Boom.notFound('Reward not found')
    }
    if (preCheck.claimedAt !== null) {
      throw Boom.conflict('Reward already claimed')
    }

    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        // Re-read inside tx to close TOCTOU window
        const userReward = await tx.userReward.findUnique({
          where: { id: rewardId },
          include: { reward: true },
        })
        if (!userReward || userReward.userId !== userId) {
          throw Boom.notFound('Reward not found')
        }
        if (userReward.claimedAt !== null) {
          throw Boom.conflict('Reward already claimed')
        }

        const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
        const {
          tokens: rewardTokens,
          dust,
          xp,
          gold: rewardGold,
        } = userReward.reward

        const [upgrades, cfg] = await Promise.all([
          this.#skillTreeRepository.getEffectsForUser(userId),
          this.#configService.getMany(
            'tokenRegenIntervalMinutes',
            'tokenMaxStock',
            'xp.base',
            'xp.slope',
            'xp.levelCap',
          ),
        ])
        const effectiveInterval = Math.max(
          1,
          cfg.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes,
        )
        const effectiveMaxStock = cfg.tokenMaxStock + upgrades.tokenVaultBonus
        const { tokens: regenTokens, newLastTokenAt } = calculateTokens(
          user.lastTokenAt,
          user.tokens,
          effectiveInterval,
          effectiveMaxStock,
          upgrades.multiTokenChance,
        )

        const newTokens = regenTokens + rewardTokens
        const newDust = user.dust + dust
        const newXp = user.xp + xp
        const newGold = user.gold + rewardGold
        const newLevel = calculateLevel(
          newXp,
          cfg['xp.base'],
          cfg['xp.slope'],
          cfg['xp.levelCap'],
        )

        const gained = skillPointsGained(user.level, newLevel)
        await this.#userRepository.updateAfterClaimInTx(tx, userId, {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          gold: newGold,
          lastTokenAt: newLastTokenAt ?? undefined,
          skillPoints: gained > 0 ? { increment: gained } : undefined,
        })
        await this.#userRewardRepository.markClaimedInTx(tx, userReward.id)

        const claimedCards = await this.#grantCardRewards(tx, userId, [
          userReward.reward,
        ])

        const claimUnlocks = await this.#achievementsDomain.track(tx, userId, {
          kind: 'REWARD_CLAIMED',
          rewardId: userReward.rewardId,
          source: userReward.source,
        })
        const levelUnlocks =
          newLevel > user.level
            ? await this.#achievementsDomain.track(tx, userId, {
                kind: 'LEVEL_UP',
                newLevel,
              })
            : []

        if (newLevel > user.level) {
          for (const pack of milestonesCrossed(user.level, newLevel)) {
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

        // Count AFTER milestone rewards are created so the caller sees the correct
        // pending total. Excludes QUEST rewards — the topbar badge never counts them.
        const pendingRewardsCount = await tx.userReward.count({
          where: { userId, claimedAt: null, source: { not: 'QUEST' } },
        })

        return {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          gold: newGold,
          pendingRewardsCount,
          unlockedAchievements: [...claimUnlocks, ...levelUnlocks],
          cards: claimedCards,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async addRewardToUser(
    userId: string,
    input: AddRewardInput,
  ): Promise<UserReward> {
    const user = await this.#userRepository.findById(userId)
    if (!user) {
      throw Boom.notFound('User not found')
    }

    return this.#userRewardRepository.create({
      userId,
      rewardId: input.rewardId,
      source: input.source,
      sourceId: randomUUID(),
    })
  }

  async claimAll(userId: string): Promise<ClaimResult | null> {
    // Optimistic early-exit
    const count = await this.#userRewardRepository.countPendingByUser(userId)
    if (count === 0) {
      return null
    }

    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        // Authoritative read inside tx. QUEST rewards are excluded from
        // "claim all" — they are claimed individually from the /quests page.
        const pending = await tx.userReward.findMany({
          where: { userId, claimedAt: null, source: { not: 'QUEST' } },
          include: { reward: true },
        })

        if (pending.length === 0) {
          return null
        }

        const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
        const totalTokens = pending.reduce((sum, r) => sum + r.reward.tokens, 0)
        const totalDust = pending.reduce((sum, r) => sum + r.reward.dust, 0)
        const totalXp = pending.reduce((sum, r) => sum + r.reward.xp, 0)
        const totalGold = pending.reduce((sum, r) => sum + r.reward.gold, 0)

        const [upgrades, cfg] = await Promise.all([
          this.#skillTreeRepository.getEffectsForUser(userId),
          this.#configService.getMany(
            'tokenRegenIntervalMinutes',
            'tokenMaxStock',
            'xp.base',
            'xp.slope',
            'xp.levelCap',
          ),
        ])
        const effectiveInterval = Math.max(
          1,
          cfg.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes,
        )
        const effectiveMaxStock = cfg.tokenMaxStock + upgrades.tokenVaultBonus
        const { tokens: regenTokens, newLastTokenAt } = calculateTokens(
          user.lastTokenAt,
          user.tokens,
          effectiveInterval,
          effectiveMaxStock,
          upgrades.multiTokenChance,
        )

        const newTokens = regenTokens + totalTokens
        const newDust = user.dust + totalDust
        const newXp = user.xp + totalXp
        const newGold = user.gold + totalGold
        const newLevel = calculateLevel(
          newXp,
          cfg['xp.base'],
          cfg['xp.slope'],
          cfg['xp.levelCap'],
        )

        const initialLevel = user.level
        const gained = skillPointsGained(initialLevel, newLevel)
        await this.#userRepository.updateAfterClaimInTx(tx, userId, {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          gold: newGold,
          lastTokenAt: newLastTokenAt ?? undefined,
          skillPoints: gained > 0 ? { increment: gained } : undefined,
        })
        await this.#userRewardRepository.markAllClaimedInTx(tx, userId)

        const claimedCards = await this.#grantCardRewards(
          tx,
          userId,
          pending.map((ur) => ur.reward),
        )

        const allUnlocks: UnlockedAchievement[] = []
        for (const ur of pending) {
          const unlocks = await this.#achievementsDomain.track(tx, userId, {
            kind: 'REWARD_CLAIMED',
            rewardId: ur.rewardId,
            source: ur.source,
          })
          allUnlocks.push(...unlocks)
        }
        let milestonePacksCreated = 0
        if (newLevel > initialLevel) {
          const levelUnlocks = await this.#achievementsDomain.track(
            tx,
            userId,
            {
              kind: 'LEVEL_UP',
              newLevel,
            },
          )
          allUnlocks.push(...levelUnlocks)
          for (const pack of milestonesCrossed(initialLevel, newLevel)) {
            const milestoneReward = await tx.reward.create({
              data: { tokens: pack.tokens, dust: pack.dust, xp: 0 },
            })
            await this.#userRewardRepository.upsertInTx(tx, {
              userId,
              rewardId: milestoneReward.id,
              source: 'LEVEL_UP',
              sourceId: `level-${pack.level}`,
            })
            milestonePacksCreated++
          }
        }

        return {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          gold: newGold,
          // milestone rewards just created are pending — surface them to the caller
          pendingRewardsCount: milestonePacksCreated,
          unlockedAchievements: allUnlocks,
          cards: claimedCards,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }
}
