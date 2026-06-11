import type { AchievementCriterion } from './criterion.types'
import type { AchievementEvent } from './events.types'

export const computeDelta = (
  criterion: AchievementCriterion,
  event: AchievementEvent,
): number => {
  if (criterion.type === 'PULL_COUNT' && event.kind === 'PULL_COMPLETED') return 1
  if (criterion.type === 'TOKENS_SPENT' && event.kind === 'TOKENS_SPENT') return event.amount
  if (criterion.type === 'DUST_SPENT' && event.kind === 'DUST_SPENT') return event.amount
  if (criterion.type === 'CARDS_RECYCLED' && event.kind === 'CARD_RECYCLED') return event.amount
  if (criterion.type === 'REWARDS_CLAIMED' && event.kind === 'REWARD_CLAIMED') return 1
  return 0
}
