import type { AchievementCriterion } from './criterion.types'
import type { AchievementEvent } from './events.types'

type StageClearedEvent = Extract<AchievementEvent, { kind: 'STAGE_CLEARED' }>

const stageClearedDelta = (
  criterion: AchievementCriterion,
  event: StageClearedEvent,
): number => {
  if (criterion.type === 'STAGES_CLEARED_COUNT') {
    return event.viaSweep ? 0 : 1
  }
  if (criterion.type === 'BOSS_DEFEATS_COUNT') {
    return !event.viaSweep && event.isBoss ? 1 : 0
  }
  if (criterion.type === 'FLAWLESS_CLEARS_COUNT') {
    return event.flawless ? 1 : 0
  }
  if (criterion.type === 'UNDERSTAFFED_CLEARS_COUNT') {
    return event.understaffed ? 1 : 0
  }
  return 0
}

export const computeDelta = (
  criterion: AchievementCriterion,
  event: AchievementEvent,
): number => {
  if (criterion.type === 'PULL_COUNT' && event.kind === 'PULL_COMPLETED') {
    return 1
  }
  if (criterion.type === 'TOKENS_SPENT' && event.kind === 'TOKENS_SPENT') {
    return event.amount
  }
  if (criterion.type === 'DUST_SPENT' && event.kind === 'DUST_SPENT') {
    return event.amount
  }
  if (criterion.type === 'CARDS_RECYCLED' && event.kind === 'CARD_RECYCLED') {
    return event.amount
  }
  if (criterion.type === 'REWARDS_CLAIMED' && event.kind === 'REWARD_CLAIMED') {
    return 1
  }
  if (event.kind === 'STAGE_CLEARED') {
    return stageClearedDelta(criterion, event)
  }
  return 0
}
