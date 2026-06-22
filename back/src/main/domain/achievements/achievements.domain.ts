import type { Achievement } from '../../../generated/client'
import type { CardRarity, CardVariant } from '../../../generated/enums'
import type { IocContainer } from '../../types/application/ioc'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type {
  AchievementsDomainInterface,
  AchievementWithProgress,
} from './achievements.domain.interface'
import { AchievementCriterionSchema, type AchievementCriterion } from './criterion.types'
import { computeDelta } from './counter-dispatcher'
import { computeStateProgress, type UserAchievementState } from './state-dispatcher'
import { getCustomHandler } from './custom-handlers'
import { counterTypesFor, stateTypesFor, isCounterCriterion, isStateCriterion } from './dispatch'
import type { AchievementEvent, UnlockedAchievement } from './events.types'

type AchievementWithReward = Achievement & {
  reward: {
    id: string
    tokens: number
    dust: number
    xp: number
    cardRarity: CardRarity | null
    createdAt: Date
  } | null
}

interface EvaluateResult {
  unlocked: boolean
  progress: number
  threshold: number
}

export class AchievementsDomain implements AchievementsDomainInterface {
  readonly #postgresOrm: PostgresOrm

  constructor({ postgresOrm }: Pick<IocContainer, 'postgresOrm'>) {
    this.#postgresOrm = postgresOrm
  }

  async track(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<UnlockedAchievement[]> {
    const candidates = await this.#loadCandidates(tx, userId, event)
    if (candidates.length === 0) {
      return []
    }

    const unlocked: UnlockedAchievement[] = []
    const state = await this.#loadUserState(tx, userId)

    for (const achievement of candidates) {
      const criterion = AchievementCriterionSchema.parse(achievement.criterion)
      const result = await this.#evaluate(tx, userId, criterion, event, state, achievement)
      if (!result.unlocked) {
        continue
      }
      const inserted = await this.#tryInsertUnlock(tx, userId, achievement)
      if (inserted) {
        unlocked.push(inserted)
      }
    }

    return unlocked
  }

  listForUser(userId: string): Promise<AchievementWithProgress[]> {
    return this.#listForUserImpl(userId)
  }

  async #listForUserImpl(userId: string): Promise<AchievementWithProgress[]> {
    const [achievements, unlocked, progressRows, state] = await Promise.all([
      this.#postgresOrm.prisma.achievement.findMany({
        where: { isActive: true },
        include: { reward: true },
        orderBy: [{ family: 'asc' }, { tier: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.#postgresOrm.prisma.userAchievement.findMany({ where: { userId } }),
      this.#postgresOrm.prisma.userAchievementProgress.findMany({ where: { userId } }),
      this.#postgresOrm.executeWithTransactionClient(
        (tx) => this.#loadUserState(tx, userId),
        { isolationLevel: 'ReadCommitted' },
      ),
    ])

    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]))
    const progressMap = new Map(progressRows.map((p) => [p.achievementId, p.progress]))

    return achievements.map((a) => {
      let criterion: AchievementCriterion
      try {
        criterion = AchievementCriterionSchema.parse(a.criterion)
      } catch {
        return this.#maskedEntry(a, 0, 1, false, null)
      }

      const unlockedAt = unlockedMap.get(a.id) ?? null
      let progress = 0
      let threshold = 1

      if (isCounterCriterion(criterion)) {
        progress = progressMap.get(a.id) ?? 0
        threshold = (criterion as { threshold: number }).threshold
      } else if (isStateCriterion(criterion)) {
        const result = computeStateProgress(criterion, state)
        progress = result.progress
        threshold = result.threshold
      } else {
        threshold = 1
        progress = unlockedAt ? 1 : 0
      }

      return this.#maskedEntry(a, progress, threshold, !!unlockedAt, unlockedAt)
    })
  }

  async listFamilies(userId: string): Promise<Array<{ family: string; total: number; unlocked: number }>> {
    const [achievements, userUnlocked] = await Promise.all([
      this.#postgresOrm.prisma.achievement.findMany({
        where: { isActive: true, family: { not: null } },
        select: { id: true, family: true },
      }),
      this.#postgresOrm.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      }),
    ])

    const unlockedSet = new Set(userUnlocked.map((u) => u.achievementId))
    const totals = new Map<string, { total: number; unlocked: number }>()
    for (const a of achievements) {
      if (!a.family) {
        continue
      }
      const entry = totals.get(a.family) ?? { total: 0, unlocked: 0 }
      entry.total += 1
      if (unlockedSet.has(a.id)) {
        entry.unlocked += 1
      }
      totals.set(a.family, entry)
    }
    return [...totals.entries()].map(([family, v]) => ({ family, ...v }))
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  #maskedEntry(
    a: AchievementWithReward,
    progress: number,
    threshold: number,
    unlocked: boolean,
    unlockedAt: Date | null,
  ): AchievementWithProgress {
    const masked = a.hidden && !unlocked
    return {
      key: a.key,
      name: masked ? '???' : a.name,
      description: masked ? '???' : a.description,
      family: a.family,
      tier: a.tier,
      hidden: a.hidden,
      iconKey: masked ? null : a.iconKey,
      sortOrder: a.sortOrder,
      progress,
      threshold,
      unlocked,
      unlockedAt: unlockedAt?.toISOString() ?? null,
      reward: a.reward
        ? {
            tokens: a.reward.tokens,
            dust: a.reward.dust,
            xp: a.reward.xp,
            cardRarity: a.reward.cardRarity,
          }
        : null,
    }
  }

  async #loadCandidates(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<AchievementWithReward[]> {
    const counterTypes = counterTypesFor(event.kind)
    const stateTypes = stateTypesFor(event.kind)

    // Collect criterion type strings that apply to this event
    const applicableTypes = new Set([...counterTypes, ...stateTypes])

    // Custom criteria are always candidates when a CUSTOM_EVENT key matches
    // We'll include CUSTOM_EVENT achievements and filter by handler below
    const allActive = await tx.achievement.findMany({
      where: {
        isActive: true,
        userAchievements: {
          none: { userId },
        },
      },
      include: { reward: true },
    })

    return allActive.filter((a) => {
      const parsed = AchievementCriterionSchema.safeParse(a.criterion)
      if (!parsed.success) {
        return false
      }
      const criterion = parsed.data
      if (criterion.type === 'CUSTOM_EVENT') {
        const handler = getCustomHandler(criterion.handlerKey)
        if (!handler) {
          return false
        }
        return handler.listensTo.includes(event.kind)
      }
      return applicableTypes.has(criterion.type)
    }) as AchievementWithReward[]
  }

  async #evaluate(
    tx: PrimaTransactionClient,
    userId: string,
    criterion: AchievementCriterion,
    event: AchievementEvent,
    state: UserAchievementState,
    achievement: AchievementWithReward,
  ): Promise<EvaluateResult> {
    switch (criterion.type) {
      case 'CUSTOM_EVENT': {
        const handler = getCustomHandler(criterion.handlerKey)
        if (!handler) {
          return { unlocked: false, progress: 0, threshold: 0 }
        }
        const result = await handler.evaluate(tx, userId, event)
        return {
          unlocked: result.unlocked,
          progress: result.progress ?? (result.unlocked ? 1 : 0),
          threshold: 1,
        }
      }

      case 'PULL_COUNT':
      case 'DUST_SPENT':
      case 'TOKENS_SPENT':
      case 'CARDS_RECYCLED':
      case 'REWARDS_CLAIMED': {
        const delta = computeDelta(criterion, event)
        if (delta === 0) {
          return { unlocked: false, progress: 0, threshold: criterion.threshold }
        }
        const updated = await tx.userAchievementProgress.upsert({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
          create: { userId, achievementId: achievement.id, progress: delta },
          update: { progress: { increment: delta } },
        })
        return {
          unlocked: updated.progress >= criterion.threshold,
          progress: updated.progress,
          threshold: criterion.threshold,
        }
      }

      case 'OWN_RARITY_COUNT':
      case 'COLLECTION_COMPLETE':
      case 'LEVEL_REACHED':
      case 'STREAK_REACHED':
      case 'MACHINES_OWNED': {
        const result = computeStateProgress(criterion, state)
        return result
      }

      default:
        return { unlocked: false, progress: 0, threshold: 0 }
    }
  }

  async #loadUserState(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<UserAchievementState> {
    const [user, ownedCards, machinesOwned] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true, streakDays: true } }),
      tx.userCard.findMany({
        where: { userId },
        select: { variant: true, quantity: true, card: { select: { rarity: true } } },
      }),
      this.#countMachinesOwned(tx, userId),
    ])

    // Build rarity/variant counts
    const ownedByRarity: Record<string, number> = {}
    const ownedByRarityVariant: Record<string, number> = {}

    for (const uc of ownedCards) {
      const rarity = uc.card.rarity as string
      const variant = uc.variant as string
      ownedByRarity[rarity] = (ownedByRarity[rarity] ?? 0) + uc.quantity
      const key = `${rarity}_${variant}`
      ownedByRarityVariant[key] = (ownedByRarityVariant[key] ?? 0) + uc.quantity
    }

    const completedCollections = await this.#computeCompletions(tx, ownedCards)

    return {
      ownedByRarity: ownedByRarity as Record<CardRarity, number>,
      ownedByRarityVariant,
      completedCollections,
      level: user.level,
      streakDays: user.streakDays,
      machinesOwned,
    }
  }

  async #countMachinesOwned(tx: PrimaTransactionClient, userId: string): Promise<number> {
    return await tx.purchase.count({
      where: {
        userId,
        shopItem: { type: 'MACHINE' },
      },
    })
  }

  async #computeCompletions(
    tx: PrimaTransactionClient,
    ownedCards: Array<{ variant: CardVariant; quantity: number; card: { rarity: CardRarity } }>,
  ): Promise<UserAchievementState['completedCollections']> {
    // Total cards per rarity in the catalog
    const totalByRarity = await tx.card.groupBy({
      by: ['rarity'],
      _count: { id: true },
    })

    // Owned distinct cards per rarity (quantity > 0 means at least one copy owned)
    const ownedDistinctByRarity: Record<string, number> = {}
    for (const uc of ownedCards) {
      const rarity = uc.card.rarity as string
      // Count distinct card/variant combos — but for COLLECTION_COMPLETE we track by card
      // We use quantity > 0 as "owned" signal; deduplicate by rarity
      if (uc.quantity > 0) {
        ownedDistinctByRarity[rarity] = (ownedDistinctByRarity[rarity] ?? 0) + 1
      }
    }

    const result: UserAchievementState['completedCollections'] = { ALL: false }
    let allComplete = true

    for (const row of totalByRarity) {
      const rarity = row.rarity as string
      const total = row._count.id
      const owned = ownedDistinctByRarity[rarity] ?? 0
      const complete = owned >= total
      // biome-ignore lint/suspicious/noExplicitAny: dynamic rarity key
      ;(result as any)[rarity] = complete
      if (!complete) {
        allComplete = false
      }
    }

    result.ALL = allComplete && totalByRarity.length > 0
    return result
  }

  async #tryInsertUnlock(
    tx: PrimaTransactionClient,
    userId: string,
    achievement: AchievementWithReward,
  ): Promise<UnlockedAchievement | null> {
    try {
      await tx.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      })

      // Queue the reward as a pending UserReward if the achievement has one
      if (achievement.rewardId) {
        await tx.userReward.create({
          data: {
            userId,
            rewardId: achievement.rewardId,
            source: 'ACHIEVEMENT',
            sourceId: achievement.id,
          },
        })
      }

      const reward = achievement.reward
        ? {
            tokens: achievement.reward.tokens,
            dust: achievement.reward.dust,
            xp: achievement.reward.xp,
            cardRarity: achievement.reward.cardRarity,
          }
        : null

      return {
        key: achievement.key,
        name: achievement.name,
        iconKey: achievement.iconKey,
        reward,
      }
    } catch (err: unknown) {
      // Unique constraint violation = already unlocked (idempotent)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return null
      }
      throw err
    }
  }
}
