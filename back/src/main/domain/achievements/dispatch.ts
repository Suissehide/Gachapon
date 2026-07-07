import type { AchievementCriterion } from './criterion.types'
import type { AchievementEventKind } from './events.types'

type CriterionType = AchievementCriterion['type']

const COUNTER_TYPES: ReadonlySet<CriterionType> = new Set([
  'PULL_COUNT',
  'DUST_SPENT',
  'TOKENS_SPENT',
  'CARDS_RECYCLED',
  'REWARDS_CLAIMED',
])

const STATE_TYPES: ReadonlySet<CriterionType> = new Set([
  'OWN_RARITY_COUNT',
  'COLLECTION_COMPLETE',
  'LEVEL_REACHED',
  'STREAK_REACHED',
  'MACHINES_OWNED',
])

export const isCounterCriterion = (c: AchievementCriterion): boolean =>
  COUNTER_TYPES.has(c.type)

export const isStateCriterion = (c: AchievementCriterion): boolean =>
  STATE_TYPES.has(c.type)

export const isCustomCriterion = (c: AchievementCriterion): boolean =>
  c.type === 'CUSTOM_EVENT'

const EVENT_TO_COUNTER_TYPES: Record<AchievementEventKind, CriterionType[]> = {
  PULL_COMPLETED: ['PULL_COUNT'],
  TOKENS_SPENT: ['TOKENS_SPENT'],
  DUST_SPENT: ['DUST_SPENT'],
  CARD_RECYCLED: ['CARDS_RECYCLED'],
  REWARD_CLAIMED: ['REWARDS_CLAIMED'],
  LEVEL_UP: [],
  STREAK_UPDATED: [],
  MACHINE_PURCHASED: [],
  STAGE_CLEARED: [],
  CARD_LEVELED: [],
  GOLD_SPENT: [],
  TEAM_JOINED: [],
}

const EVENT_TO_STATE_TYPES: Record<AchievementEventKind, CriterionType[]> = {
  PULL_COMPLETED: ['OWN_RARITY_COUNT', 'COLLECTION_COMPLETE'],
  TOKENS_SPENT: [],
  DUST_SPENT: [],
  CARD_RECYCLED: ['OWN_RARITY_COUNT', 'COLLECTION_COMPLETE'],
  REWARD_CLAIMED: [],
  LEVEL_UP: ['LEVEL_REACHED'],
  STREAK_UPDATED: ['STREAK_REACHED'],
  MACHINE_PURCHASED: ['MACHINES_OWNED'],
  STAGE_CLEARED: [],
  CARD_LEVELED: [],
  GOLD_SPENT: [],
  TEAM_JOINED: [],
}

export const counterTypesFor = (kind: AchievementEventKind): CriterionType[] =>
  EVENT_TO_COUNTER_TYPES[kind]

export const stateTypesFor = (kind: AchievementEventKind): CriterionType[] =>
  EVENT_TO_STATE_TYPES[kind]
