import { randomUUID } from 'node:crypto'

import Boom from '@hapi/boom'

import type { UserReward } from '../../../generated/client'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  AddRewardInput,
  ClaimResult,
  RewardsDomainInterface,
} from '../../types/domain/rewards/rewards.domain.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type {
  PendingUserReward,
  UserRewardRepositoryInterface,
  UserRewardWithReward,
} from '../../types/infra/orm/repositories/user-reward.repository.interface'
import { calculateLevel } from '../shared/xp'

export class RewardsDomain implements RewardsDomainInterface {
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({
    userRewardRepository,
    userRepository,
    postgresOrm,
  }: Pick<IocContainer, 'userRewardRepository' | 'userRepository' | 'postgresOrm'>) {
    this.#userRewardRepository = userRewardRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
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
        const { tokens, dust, xp } = userReward.reward

        const newTokens = user.tokens + tokens
        const newDust = user.dust + dust
        const newXp = user.xp + xp
        const newLevel = calculateLevel(newXp)

        await this.#userRepository.updateAfterClaimInTx(tx, userId, {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
        })
        await this.#userRewardRepository.markClaimedInTx(tx, userReward.id)
        // Count INSIDE tx so it reflects the just-committed mark
        const pendingRewardsCount = await tx.userReward.count({
          where: { userId, claimedAt: null },
        })

        return {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          pendingRewardsCount,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async addRewardToUser(userId: string, input: AddRewardInput): Promise<UserReward> {
    const user = await this.#userRepository.findById(userId)
    if (!user) throw Boom.notFound('User not found')

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
        // Authoritative read inside tx
        const pending = await tx.userReward.findMany({
          where: { userId, claimedAt: null },
          include: { reward: true },
        })

        if (pending.length === 0) {
          return null
        }

        const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
        const totalTokens = pending.reduce((sum, r) => sum + r.reward.tokens, 0)
        const totalDust = pending.reduce((sum, r) => sum + r.reward.dust, 0)
        const totalXp = pending.reduce((sum, r) => sum + r.reward.xp, 0)

        const newTokens = user.tokens + totalTokens
        const newDust = user.dust + totalDust
        const newXp = user.xp + totalXp
        const newLevel = calculateLevel(newXp)

        await this.#userRepository.updateAfterClaimInTx(tx, userId, {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
        })
        await this.#userRewardRepository.markAllClaimedInTx(tx, userId)

        return {
          tokens: newTokens,
          dust: newDust,
          xp: newXp,
          level: newLevel,
          pendingRewardsCount: 0,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }
}
