/**
 * QuestsDomain — orchestrates quest progress tracking and reward delivery.
 *
 * ## Quest cache
 * Active Quest rows are cached in a process-level Map keyed by periodKey with
 * a TTL of 60 s.  When the calendar week rolls over the periodKey changes and
 * the new key causes a fresh DB load.  Admin CRUD (create/update/delete Quest)
 * invalidates the cache naively through TTL expiry — changes will be visible
 * within 60 s.  If you need immediate invalidation, restart the process or add
 * an explicit `clearQuestCache()` call from the admin route.
 */

import type { Quest, Reward } from '../../../generated/client'
import type { QuestPeriod } from '../../../generated/enums'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IQuestsDomain,
  QuestState,
  QuestStateItem,
} from '../../types/domain/quests/quests.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { IUserQuestRepository } from '../../types/infra/orm/repositories/user-quest.repository.interface'
import type { UserRewardRepositoryInterface } from '../../types/infra/orm/repositories/user-reward.repository.interface'
import type { Logger } from '../../types/utils/logger'
import { isPrismaSerializationError } from '../shared/retry-serialization'
import type {
  AchievementEvent,
  AchievementEventKind,
} from '../achievements/events.types'
import type { QuestCriterion } from './quest-matching'
import {
  mondayOfUtcWeek,
  pickWeeklyQuests,
  questIncrement,
} from './quest-matching'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type QuestWithReward = Quest & {
  period: QuestPeriod
  reward: Pick<Reward, 'id' | 'tokens' | 'dust' | 'xp' | 'gold'> | null
}

interface ActiveQuestPool {
  oneshot: QuestWithReward[]
  weekly: QuestWithReward[]
}

interface CacheEntry {
  pool: ActiveQuestPool
  expiresAt: number
}

// ---------------------------------------------------------------------------
// QuestsDomain
// ---------------------------------------------------------------------------

export class QuestsDomain implements IQuestsDomain {
  readonly #postgresOrm: PostgresOrm
  readonly #userQuestRepository: IUserQuestRepository
  readonly #userRewardRepository: UserRewardRepositoryInterface
  readonly #logger: Logger | undefined

  /** Process-level cache keyed by periodKey. TTL = 60 s (see module doc). */
  readonly #cache = new Map<string, CacheEntry>()
  static readonly CACHE_TTL_MS = 60_000

  constructor({
    postgresOrm,
    userQuestRepository,
    userRewardRepository,
    logger,
  }: Pick<
    IocContainer,
    'postgresOrm' | 'userQuestRepository' | 'userRewardRepository' | 'logger'
  >) {
    this.#postgresOrm = postgresOrm
    this.#userQuestRepository = userQuestRepository
    this.#userRewardRepository = userRewardRepository
    this.#logger = logger
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Track an event against all applicable quests inside an existing transaction.
   *
   * Fail-safe: errors are caught/logged, except P2034 which is re-thrown for retry.
   */
  async trackInTx(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<void> {
    try {
      await this.#trackImpl(tx, userId, event)
    } catch (err) {
      if (isPrismaSerializationError(err)) {
        throw err
      }
      this.#logger?.warn(
        `Quest tracking error — skipped (userId=${userId}, kind=${event.kind}): ${String(err)}`,
      )
    }
  }

  /**
   * Returns the current quest state for a user.
   * Lazy-initialises missing UserQuest rows for the current week and oneshot.
   */
  async getStateForUser(userId: string): Promise<QuestState> {
    const weeklyPeriodKey = mondayOfUtcWeek(new Date())
    const pool = await this.#getActiveQuestPool(weeklyPeriodKey)
    const weeklyQuests = pickWeeklyQuests(pool.weekly, weeklyPeriodKey)
    const oneshotQuests = pool.oneshot

    // Load existing UserQuests
    const existing = await this.#userQuestRepository.findByUserAndPeriodKeys(
      userId,
      ['oneshot', weeklyPeriodKey],
    )
    const uqMap = new Map(
      existing.map((uq) => [`${uq.questId}:${uq.periodKey}`, uq]),
    )

    // Lazy-init missing rows
    const toCreate: Array<{
      userId: string
      questId: string
      periodKey: string
    }> = []
    for (const q of weeklyQuests) {
      if (!uqMap.has(`${q.id}:${weeklyPeriodKey}`)) {
        toCreate.push({ userId, questId: q.id, periodKey: weeklyPeriodKey })
      }
    }
    for (const q of oneshotQuests) {
      if (!uqMap.has(`${q.id}:oneshot`)) {
        toCreate.push({ userId, questId: q.id, periodKey: 'oneshot' })
      }
    }
    if (toCreate.length > 0) {
      await this.#userQuestRepository.createManySkipDuplicates(toCreate)
      // Reload to pick up freshly created rows
      const reloaded = await this.#userQuestRepository.findByUserAndPeriodKeys(
        userId,
        ['oneshot', weeklyPeriodKey],
      )
      for (const uq of reloaded) {
        uqMap.set(`${uq.questId}:${uq.periodKey}`, uq)
      }
    }

    // Build weekly state
    const weekly: QuestStateItem[] = weeklyQuests.map((q) => {
      const uq = uqMap.get(`${q.id}:${weeklyPeriodKey}`)
      const target = this.#parseTarget(q.criterion)
      return {
        key: q.key,
        name: q.name,
        description: q.description,
        progress: uq?.progress ?? 0,
        target,
        completed: uq?.completed ?? false,
        reward: q.reward
          ? {
              tokens: q.reward.tokens,
              dust: q.reward.dust,
              xp: q.reward.xp,
              gold: q.reward.gold,
            }
          : null,
      }
    })

    // Weekly bonus: check whether the bonus UserReward was already granted
    const bonusSourceId = `weekly-bonus:${weeklyPeriodKey}`
    const bonusReward = await this.#userRewardRepository.findByUserSourceAndSourceId(
      userId,
      'QUEST',
      bonusSourceId,
    )

    // Build oneshot state
    const oneshot: QuestStateItem[] = oneshotQuests.map((q) => {
      const uq = uqMap.get(`${q.id}:oneshot`)
      const target = this.#parseTarget(q.criterion)
      return {
        key: q.key,
        name: q.name,
        description: q.description,
        progress: uq?.progress ?? 0,
        target,
        completed: uq?.completed ?? false,
        reward: q.reward
          ? {
              tokens: q.reward.tokens,
              dust: q.reward.dust,
              xp: q.reward.xp,
              gold: q.reward.gold,
            }
          : null,
      }
    })

    return {
      weekly,
      weeklyBonusCompleted: bonusReward !== null,
      oneshot,
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async #trackImpl(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<void> {
    const periodKey = mondayOfUtcWeek(new Date())
    const pool = await this.#getActiveQuestPool(periodKey)

    const weeklyQuests = pickWeeklyQuests(pool.weekly, periodKey)

    const candidates = [
      ...pool.oneshot.map((q) => ({ quest: q, questPeriodKey: 'oneshot' })),
      ...weeklyQuests.map((q) => ({ quest: q, questPeriodKey: periodKey })),
    ]

    for (const { quest, questPeriodKey } of candidates) {
      const criterion = this.#parseCriterion(quest.criterion)
      if (!criterion) {
        continue
      }

      const inc = questIncrement(criterion, event)
      if (inc === 0) {
        continue
      }

      await this.#applyIncrement(
        tx,
        userId,
        quest,
        questPeriodKey,
        inc,
        criterion.target,
      )
    }

    // Check whether all 3 weekly quests are done → grant weekly bonus
    if (weeklyQuests.length > 0) {
      await this.#checkAndGrantWeeklyBonus(tx, userId, weeklyQuests, periodKey)
    }
  }

  /**
   * Atomically applies an increment to a UserQuest row.
   * If the quest completes, marks it done and queues the reward.
   */
  async #applyIncrement(
    tx: PrimaTransactionClient,
    userId: string,
    quest: QuestWithReward,
    periodKey: string,
    inc: number,
    target: number,
  ): Promise<void> {
    const existing = await this.#userQuestRepository.findUniqueInTx(tx, {
      userId,
      questId: quest.id,
      periodKey,
    })

    if (existing?.completed) {
      return // already completed — nothing to do
    }

    const currentProgress = existing?.progress ?? 0
    const newProgress = Math.min(currentProgress + inc, target)
    const justCompleted = newProgress >= target

    await this.#userQuestRepository.upsertInTx(tx, {
      userId,
      questId: quest.id,
      periodKey,
      progress: newProgress,
      completed: justCompleted,
      completedAt: justCompleted ? new Date() : null,
    })

    if (justCompleted && quest.rewardId) {
      // Quest references a Reward template — create a UserReward pointing to it
      // sourceId = "<questKey>:<periodKey>" provides idempotency (@@unique constraint)
      await this.#userRewardRepository.upsertInTx(tx, {
        userId,
        rewardId: quest.rewardId,
        source: 'QUEST',
        sourceId: `${quest.key}:${periodKey}`,
      })
    }
  }

  /**
   * If all weekly quests for the given periodKey are completed, grants a bonus
   * reward (gold 2000, xp 300) idempotently.
   *
   * The bonus Reward row is created fresh (no shared template) — the UserReward
   * unique constraint `[userId, source, sourceId]` guarantees the bonus is
   * granted only once per user per week.
   */
  async #checkAndGrantWeeklyBonus(
    tx: PrimaTransactionClient,
    userId: string,
    weeklyQuests: QuestWithReward[],
    periodKey: string,
  ): Promise<void> {
    const completedCount = await tx.userQuest.count({
      where: {
        userId,
        questId: { in: weeklyQuests.map((q) => q.id) },
        periodKey,
        completed: true,
      },
    })

    if (completedCount < weeklyQuests.length) {
      return
    }

    const bonusSourceId = `weekly-bonus:${periodKey}`

    // Idempotency check — skip if already granted
    const existingBonus = await tx.userReward.findUnique({
      where: {
        userId_source_sourceId: {
          userId,
          source: 'QUEST',
          sourceId: bonusSourceId,
        },
      },
    })
    if (existingBonus) {
      return
    }

    // Create the bonus Reward (not a template — created on demand)
    const bonusReward = await tx.reward.create({
      data: { gold: 2000, xp: 300 },
    })

    await tx.userReward.create({
      data: {
        userId,
        rewardId: bonusReward.id,
        source: 'QUEST',
        sourceId: bonusSourceId,
      },
    })
  }

  /**
   * Loads active quests from the DB (or returns from cache).
   * Cache key = periodKey; TTL = 60 s.
   */
  async #getActiveQuestPool(periodKey: string): Promise<ActiveQuestPool> {
    const cached = this.#cache.get(periodKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.pool
    }

    const quests = await this.#postgresOrm.prisma.quest.findMany({
      where: { isActive: true },
      include: {
        reward: {
          select: { id: true, tokens: true, dust: true, xp: true, gold: true },
        },
      },
    })

    const pool: ActiveQuestPool = {
      oneshot: quests.filter(
        (q) => q.period === 'ONESHOT',
      ) as QuestWithReward[],
      weekly: quests.filter((q) => q.period === 'WEEKLY') as QuestWithReward[],
    }

    this.#cache.set(periodKey, {
      pool,
      expiresAt: Date.now() + QuestsDomain.CACHE_TTL_MS,
    })

    // Evict expired entries for old period keys
    for (const [key, entry] of this.#cache) {
      if (key !== periodKey && Date.now() >= entry.expiresAt) {
        this.#cache.delete(key)
      }
    }

    return pool
  }

  /**
   * Parses the criterion Json field into a typed QuestCriterion.
   * Returns null if the criterion is malformed.
   */
  #parseCriterion(json: unknown): QuestCriterion | null {
    if (typeof json !== 'object' || json === null) {
      return null
    }
    const j = json as Record<string, unknown>
    if (typeof j.event !== 'string' || typeof j.target !== 'number') {
      return null
    }

    const criterion: QuestCriterion = {
      event: j.event as AchievementEventKind,
      target: j.target,
    }

    if (
      j.filter !== undefined &&
      typeof j.filter === 'object' &&
      j.filter !== null
    ) {
      const f = j.filter as Record<string, unknown>
      criterion.filter = {}
      if (typeof f.rarity === 'string') {
        // biome-ignore lint/suspicious/noExplicitAny: casting Json string to enum
        criterion.filter.rarity = f.rarity as any
      }
      if (f.uniqueOnly === true) {
        criterion.filter.uniqueOnly = true
      }
    }

    return criterion
  }

  /** Extracts target from the criterion Json, defaulting to 1. */
  #parseTarget(json: unknown): number {
    if (typeof json !== 'object' || json === null) {
      return 1
    }
    const j = json as Record<string, unknown>
    return typeof j.target === 'number' ? j.target : 1
  }
}
