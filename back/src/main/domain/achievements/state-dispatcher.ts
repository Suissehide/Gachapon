import type { CardRarity } from '../../../generated/enums'
import type { AchievementCriterion } from './criterion.types'

export interface UserAchievementState {
  ownedByRarity: Record<CardRarity, number>
  ownedByRarityVariant: Record<string, number>
  completedCollections: { ALL: boolean } & Partial<Record<CardRarity, boolean>>
  completedSetsCount: number
  level: number
  streakDays: number
  machinesOwned: number
}

export interface StateProgressResult {
  progress: number
  threshold: number
  unlocked: boolean
}

const computeOwnRarityCount = (
  criterion: Extract<AchievementCriterion, { type: 'OWN_RARITY_COUNT' }>,
  state: UserAchievementState,
): number => {
  if (criterion.rarity && criterion.variant) {
    return (
      state.ownedByRarityVariant[`${criterion.rarity}_${criterion.variant}`] ??
      0
    )
  }
  if (criterion.rarity) {
    // `ownedByRarity` is built sparsely (only keys the user owns), so missing
    // rarities resolve to `undefined`. Coalesce to 0 so the response schema
    // never sees an undefined progress value.
    return state.ownedByRarity[criterion.rarity] ?? 0
  }
  const suffix = `_${criterion.variant}`
  let count = 0
  for (const [key, n] of Object.entries(state.ownedByRarityVariant)) {
    if (key.endsWith(suffix)) {
      count += n
    }
  }
  return count
}

export const computeStateProgress = (
  criterion: AchievementCriterion,
  state: UserAchievementState,
): StateProgressResult => {
  switch (criterion.type) {
    case 'OWN_RARITY_COUNT': {
      const count = computeOwnRarityCount(criterion, state)
      return {
        progress: count,
        threshold: criterion.threshold,
        unlocked: count >= criterion.threshold,
      }
    }
    case 'COLLECTION_COMPLETE': {
      const done =
        criterion.scope === 'ALL'
          ? state.completedCollections.ALL
          : (state.completedCollections[criterion.scope.rarity] ?? false)
      return { progress: done ? 1 : 0, threshold: 1, unlocked: done }
    }
    case 'LEVEL_REACHED': {
      return {
        progress: state.level,
        threshold: criterion.threshold,
        unlocked: state.level >= criterion.threshold,
      }
    }
    case 'STREAK_REACHED': {
      return {
        progress: state.streakDays,
        threshold: criterion.threshold,
        unlocked: state.streakDays >= criterion.threshold,
      }
    }
    case 'MACHINES_OWNED': {
      return {
        progress: state.machinesOwned,
        threshold: criterion.threshold,
        unlocked: state.machinesOwned >= criterion.threshold,
      }
    }
    case 'SETS_COMPLETED': {
      return {
        progress: state.completedSetsCount,
        threshold: criterion.threshold,
        unlocked: state.completedSetsCount >= criterion.threshold,
      }
    }
    default: {
      return { progress: 0, threshold: 0, unlocked: false }
    }
  }
}
