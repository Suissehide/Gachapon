import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { ClaimResult, RewardsDomainInterface } from '../../types/domain/rewards/rewards.domain.interface'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { PendingUserReward, UserRewardWithReward } from '../../types/infra/orm/repositories/user-reward.repository.interface'

export class RewardsDomain implements RewardsDomainInterface {
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({ userRewardRepository, userRepository, postgresOrm }: IocContainer) {
    this.#userRewardRepository = userRewardRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  getPending(userId: string): Promise<PendingUserReward[]> {
    return this.#userRewardRepository.findPendingByUser(userId)
  }

  async getHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: UserRewardWithReward[]; total: number }> {
    const safeLimit = Math.min(limit, 100)
    return this.#userRewardRepository.findHistoryByUser(userId, page, safeLimit)
  }

  async claimOne(rewardId: string, userId: string): Promise<ClaimResult> {
    // Load without claimedAt filter to distinguish 404 vs 409
    const userReward = await this.#userRewardRepository.findByIdAndUser(rewardId, userId)
    if (!userReward) throw Boom.notFound('Reward not found')
    if (userReward.claimedAt !== null) throw Boom.conflict('Reward already claimed')

    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
      const { tokens, dust, xp } = userReward.reward

      const newTokens = user.tokens + tokens
      const newDust = user.dust + dust
      const newXp = user.xp + xp
      const newLevel = calculateLevel(newXp)

      await tx.user.update({
        where: { id: userId },
        data: { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel },
      })
      await this.#userRewardRepository.markClaimedInTx(tx, userReward.id)
      // Count INSIDE tx so it reflects the just-committed mark
      const pendingRewardsCount = await tx.userReward.count({ where: { userId, claimedAt: null } })

      return { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel, pendingRewardsCount }
    })
  }

  async claimAll(userId: string): Promise<ClaimResult | null> {
    const pending = await this.#userRewardRepository.findPendingByUser(userId)
    if (pending.length === 0) return null

    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)

      const totalTokens = pending.reduce((sum, r) => sum + r.reward.tokens, 0)
      const totalDust = pending.reduce((sum, r) => sum + r.reward.dust, 0)
      const totalXp = pending.reduce((sum, r) => sum + r.reward.xp, 0)

      const newTokens = user.tokens + totalTokens
      const newDust = user.dust + totalDust
      const newXp = user.xp + totalXp
      const newLevel = calculateLevel(newXp)

      await tx.user.update({
        where: { id: userId },
        data: { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel },
      })
      await this.#userRewardRepository.markAllClaimedInTx(tx, userId)

      return { tokens: newTokens, dust: newDust, xp: newXp, level: newLevel, pendingRewardsCount: 0 }
    })
  }
}

function calculateLevel(xp: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / 100)) + 1, 100)
}
