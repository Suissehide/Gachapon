import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { StreakMilestoneRepositoryInterface } from '../../types/infra/orm/repositories/streak-milestone.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

type StreakInput = {
  lastLoginAt: Date | null
  streakDays: number
  bestStreak: number
}

type StreakUpdateResult = {
  shouldSkip: boolean
  newStreakDays: number
  newBestStreak: number
}

/** Pure function — no I/O. Computes new streak state. */
export function calculateStreakUpdate(input: StreakInput): StreakUpdateResult {
  const { lastLoginAt, streakDays, bestStreak } = input

  if (lastLoginAt === null) {
    return { shouldSkip: false, newStreakDays: 1, newBestStreak: Math.max(bestStreak, 1) }
  }

  const nowDay = utcDayStart(new Date())
  const lastDay = utcDayStart(lastLoginAt)
  const dayGap = Math.round((nowDay.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000))

  if (dayGap === 0) {
    return { shouldSkip: true, newStreakDays: streakDays, newBestStreak: bestStreak }
  }

  let newStreakDays: number
  let newBestStreak = bestStreak

  if (dayGap === 1) {
    newStreakDays = streakDays + 1
  } else {
    newBestStreak = Math.max(bestStreak, streakDays)
    newStreakDays = 1
  }

  newBestStreak = Math.max(newBestStreak, newStreakDays)
  return { shouldSkip: false, newStreakDays, newBestStreak }
}

function utcDayStart(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export class StreakDomain {
  readonly #userRepository: UserRepositoryInterface
  readonly #streakMilestoneRepository: StreakMilestoneRepositoryInterface
  readonly #userRewardRepository: UserRewardRepositoryInterface

  constructor({
    userRepository,
    streakMilestoneRepository,
    userRewardRepository,
  }: {
    userRepository: UserRepositoryInterface
    streakMilestoneRepository: StreakMilestoneRepositoryInterface
    userRewardRepository: UserRewardRepositoryInterface
  }) {
    this.#userRepository = userRepository
    this.#streakMilestoneRepository = streakMilestoneRepository
    this.#userRewardRepository = userRewardRepository
  }

  /** Call this inside an existing transaction after successful auth. */
  async updateStreak(userId: string, tx: PrimaTransactionClient): Promise<void> {
    const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
    const { shouldSkip, newStreakDays, newBestStreak } = calculateStreakUpdate({
      lastLoginAt: user.lastLoginAt,
      streakDays: user.streakDays,
      bestStreak: user.bestStreak,
    })

    if (shouldSkip) return

    await tx.user.update({
      where: { id: userId },
      data: { streakDays: newStreakDays, bestStreak: newBestStreak, lastLoginAt: new Date() },
    })

    const milestone = await this.#streakMilestoneRepository.findBestForDay(newStreakDays)
    if (!milestone) return

    await this.#userRewardRepository.upsertInTx(tx, {
      userId,
      rewardId: milestone.rewardId,
      source: 'STREAK',
      sourceId: milestone.id,
    })
  }
}
