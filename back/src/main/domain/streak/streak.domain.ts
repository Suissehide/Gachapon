import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { UnlockedAchievement } from '../achievements/events.types'
import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { encodeDailySourceId } from './streak-source-id'

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
    return {
      shouldSkip: false,
      newStreakDays: 1,
      newBestStreak: Math.max(bestStreak, 1),
    }
  }

  const nowDay = utcDayStart(new Date())
  const lastDay = utcDayStart(lastLoginAt)
  const dayGap = Math.round(
    (nowDay.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (dayGap === 0) {
    return {
      shouldSkip: true,
      newStreakDays: streakDays,
      newBestStreak: bestStreak,
    }
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
  readonly #userRepository: IocContainer['userRepository']
  readonly #streakMilestoneRepository: IocContainer['streakMilestoneRepository']
  readonly #userRewardRepository: IocContainer['userRewardRepository']
  readonly #achievementsDomain: AchievementsDomainInterface

  constructor({
    userRepository,
    streakMilestoneRepository,
    userRewardRepository,
    achievementsDomain,
  }: Pick<
    IocContainer,
    | 'userRepository'
    | 'streakMilestoneRepository'
    | 'userRewardRepository'
    | 'achievementsDomain'
  >) {
    this.#userRepository = userRepository
    this.#streakMilestoneRepository = streakMilestoneRepository
    this.#userRewardRepository = userRewardRepository
    this.#achievementsDomain = achievementsDomain
  }

  /** Call this inside an existing transaction after successful auth. */
  async updateStreak(
    userId: string,
    tx: PrimaTransactionClient,
  ): Promise<UnlockedAchievement[]> {
    const user = await this.#userRepository.findByIdOrThrowInTx(tx, userId)
    const existingStreakDays = user.streakDays
    const { shouldSkip, newStreakDays, newBestStreak } = calculateStreakUpdate({
      lastLoginAt: user.lastLoginAt,
      streakDays: user.streakDays,
      bestStreak: user.bestStreak,
    })

    if (shouldSkip) {
      return []
    }

    await this.#userRepository.updateStreakInTx(tx, userId, {
      streakDays: newStreakDays,
      bestStreak: newBestStreak,
      lastLoginAt: new Date(),
    })

    // Check for an exact milestone match first, then fall back to the daily default
    const milestone =
      (await this.#streakMilestoneRepository.findExactMilestoneForDay(
        newStreakDays,
      )) ?? (await this.#streakMilestoneRepository.findDefault())

    if (!milestone) {
      return []
    }

    // sourceId uniqueness drives upsert idempotency. Milestones use their UUID (earned once);
    // daily defaults encode the streak day so each login accumulates a separate reward.
    const sourceId =
      milestone.day === 0 ? encodeDailySourceId(newStreakDays) : milestone.id

    // TODO(remove after 2026-06-01): cleans up rewards written before the "day:N" format,
    // where all default rewards shared the milestone UUID as sourceId, causing upsert collisions.
    if (milestone.day === 0) {
      await this.#userRewardRepository.deleteLegacyDefaultStreakRewardInTx(
        tx,
        userId,
        milestone.id,
      )
    }

    await this.#userRewardRepository.upsertInTx(tx, {
      userId,
      rewardId: milestone.rewardId,
      source: 'STREAK',
      sourceId,
    })

    const unlocks =
      newStreakDays > existingStreakDays
        ? await this.#achievementsDomain.track(tx, userId, {
            kind: 'STREAK_UPDATED',
            days: newStreakDays,
          })
        : []

    return unlocks
  }
}
