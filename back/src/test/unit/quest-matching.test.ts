import { describe, expect, it } from '@jest/globals'
import type { AchievementEvent } from '../../main/domain/achievements/events.types'
import {
  type QuestCriterion,
  mondayOfUtcWeek,
  pickWeeklyQuests,
  questIncrement,
} from '../../main/domain/quests/quest-matching'

// ---------------------------------------------------------------------------
// questIncrement
// ---------------------------------------------------------------------------
describe('questIncrement', () => {
  const baseCriterion: QuestCriterion = { event: 'PULL_COMPLETED', target: 10 }

  it('returns 1 for a matching event without amount field', () => {
    const event: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'COMMON',
      variant: 'NORMAL',
      wasDuplicate: false,
    }
    expect(questIncrement(baseCriterion, event)).toBe(1)
  })

  it('returns event.amount for events that carry an amount', () => {
    const criterion: QuestCriterion = { event: 'TOKENS_SPENT', target: 100 }
    const event: AchievementEvent = { kind: 'TOKENS_SPENT', amount: 5 }
    expect(questIncrement(criterion, event)).toBe(5)
  })

  it('returns event.amount for DUST_SPENT', () => {
    const criterion: QuestCriterion = { event: 'DUST_SPENT', target: 50 }
    const event: AchievementEvent = { kind: 'DUST_SPENT', amount: 12 }
    expect(questIncrement(criterion, event)).toBe(12)
  })

  it('returns 0 for kind mismatch', () => {
    const event: AchievementEvent = { kind: 'TOKENS_SPENT', amount: 5 }
    expect(questIncrement(baseCriterion, event)).toBe(0)
  })

  it('applies rarity filter — matching rarity passes', () => {
    const criterion: QuestCriterion = {
      event: 'PULL_COMPLETED',
      target: 5,
      filter: { rarity: 'LEGENDARY' },
    }
    const event: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'LEGENDARY',
      variant: 'NORMAL',
      wasDuplicate: false,
    }
    expect(questIncrement(criterion, event)).toBe(1)
  })

  it('applies rarity filter — mismatching rarity returns 0', () => {
    const criterion: QuestCriterion = {
      event: 'PULL_COMPLETED',
      target: 5,
      filter: { rarity: 'LEGENDARY' },
    }
    const event: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'COMMON',
      variant: 'NORMAL',
      wasDuplicate: false,
    }
    expect(questIncrement(criterion, event)).toBe(0)
  })

  it('applies uniqueOnly filter — non-duplicate (wasDuplicate=false) passes', () => {
    const criterion: QuestCriterion = {
      event: 'PULL_COMPLETED',
      target: 3,
      filter: { uniqueOnly: true },
    }
    const event: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'COMMON',
      variant: 'NORMAL',
      wasDuplicate: false,
    }
    expect(questIncrement(criterion, event)).toBe(1)
  })

  it('applies uniqueOnly filter — duplicate (wasDuplicate=true) returns 0', () => {
    const criterion: QuestCriterion = {
      event: 'PULL_COMPLETED',
      target: 3,
      filter: { uniqueOnly: true },
    }
    const event: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'COMMON',
      variant: 'NORMAL',
      wasDuplicate: true,
    }
    expect(questIncrement(criterion, event)).toBe(0)
  })

  it('combines rarity and uniqueOnly — both must pass', () => {
    const criterion: QuestCriterion = {
      event: 'PULL_COMPLETED',
      target: 3,
      filter: { rarity: 'EPIC', uniqueOnly: true },
    }
    // Right rarity, but duplicate
    const eventDuplicate: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'EPIC',
      variant: 'NORMAL',
      wasDuplicate: true,
    }
    expect(questIncrement(criterion, eventDuplicate)).toBe(0)

    // Right rarity, not duplicate
    const eventOk: AchievementEvent = {
      kind: 'PULL_COMPLETED',
      cardId: 'card-1',
      rarity: 'EPIC',
      variant: 'NORMAL',
      wasDuplicate: false,
    }
    expect(questIncrement(criterion, eventOk)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// mondayOfUtcWeek
// ---------------------------------------------------------------------------
describe('mondayOfUtcWeek', () => {
  // 2024-01-01 = Monday, verified
  it('Wednesday returns the Monday of the same week', () => {
    const wednesday = new Date('2024-01-03T12:34:56Z') // 2024-01-03 = Wednesday
    expect(mondayOfUtcWeek(wednesday)).toBe('2024-01-01')
  })

  it('Sunday returns the Monday of the PREVIOUS week', () => {
    const sunday = new Date('2024-01-07T23:59:59Z') // 2024-01-07 = Sunday
    expect(mondayOfUtcWeek(sunday)).toBe('2024-01-01')
  })

  it('Monday 00:00 UTC returns itself', () => {
    const monday = new Date('2024-01-01T00:00:00Z')
    expect(mondayOfUtcWeek(monday)).toBe('2024-01-01')
  })

  it('Saturday returns the Monday of the same week', () => {
    const saturday = new Date('2024-01-06T08:00:00Z') // 2024-01-06 = Saturday
    expect(mondayOfUtcWeek(saturday)).toBe('2024-01-01')
  })

  it('handles month border — 2023-12-31 (Sunday) → 2023-12-25 (Monday)', () => {
    const dec31 = new Date('2023-12-31T00:00:00Z') // Sunday
    expect(mondayOfUtcWeek(dec31)).toBe('2023-12-25')
  })

  it('handles year border — 2024-01-01 is Monday', () => {
    const jan1 = new Date('2024-01-01T15:00:00Z')
    expect(mondayOfUtcWeek(jan1)).toBe('2024-01-01')
  })

  it('handles year border — 2025-01-01 (Wednesday) → 2024-12-30 (Monday)', () => {
    const jan1_2025 = new Date('2025-01-01T00:00:00Z') // Wednesday
    expect(mondayOfUtcWeek(jan1_2025)).toBe('2024-12-30')
  })
})

// ---------------------------------------------------------------------------
// pickWeeklyQuests
// ---------------------------------------------------------------------------
describe('pickWeeklyQuests', () => {
  const pool = [
    { key: 'quest-a', name: 'Quest A' },
    { key: 'quest-b', name: 'Quest B' },
    { key: 'quest-c', name: 'Quest C' },
    { key: 'quest-d', name: 'Quest D' },
    { key: 'quest-e', name: 'Quest E' },
  ]

  it('returns count=3 items from pool of 5', () => {
    const result = pickWeeklyQuests(pool, '2024-01-01', 3)
    expect(result).toHaveLength(3)
  })

  it('is deterministic — two calls with same periodKey yield identical result', () => {
    const r1 = pickWeeklyQuests(pool, '2024-01-01', 3)
    const r2 = pickWeeklyQuests(pool, '2024-01-01', 3)
    expect(r1.map((q) => q.key)).toEqual(r2.map((q) => q.key))
  })

  it('different periodKeys generally produce different results', () => {
    const r1 = pickWeeklyQuests(pool, '2024-01-01', 3)
    const r2 = pickWeeklyQuests(pool, '2024-01-08', 3)
    // With a 5-element pool P(same ordered triple) ≈ 1/60 — safe to assert inequality
    expect(r1.map((q) => q.key)).not.toEqual(r2.map((q) => q.key))
  })

  it('returns distinct quests (no duplicates)', () => {
    const result = pickWeeklyQuests(pool, '2024-01-01', 3)
    const keys = result.map((q) => q.key)
    expect(new Set(keys).size).toBe(3)
  })

  it('is stable with respect to pool input order (sorted by key before shuffle)', () => {
    const shuffledPool = [
      { key: 'quest-e', name: 'Quest E' },
      { key: 'quest-c', name: 'Quest C' },
      { key: 'quest-a', name: 'Quest A' },
      { key: 'quest-d', name: 'Quest D' },
      { key: 'quest-b', name: 'Quest B' },
    ]
    const r1 = pickWeeklyQuests(pool, '2024-01-01', 3)
    const r2 = pickWeeklyQuests(shuffledPool, '2024-01-01', 3)
    expect(r1.map((q) => q.key)).toEqual(r2.map((q) => q.key))
  })

  it('returns the whole pool when pool.length <= count', () => {
    const smallPool = [{ key: 'quest-a' }, { key: 'quest-b' }]
    const result = pickWeeklyQuests(smallPool, '2024-01-01', 3)
    expect(result).toHaveLength(2)
    expect(result.map((q) => q.key).sort()).toEqual(['quest-a', 'quest-b'])
  })

  it('returns empty array for empty pool', () => {
    const result = pickWeeklyQuests([], '2024-01-01', 3)
    expect(result).toHaveLength(0)
  })

  // Golden values — pinned outputs guarantee determinism + prevent unintended hash/PRNG
  // changes. If this test breaks, it is a PRODUCT DECISION to reassign weekly quests
  // for all users — not a refactor.
  it('golden value — week 2026-07-20', () => {
    const result = pickWeeklyQuests(pool, '2026-07-20', 3)
    expect(result.map((q) => q.key)).toEqual(['quest-b', 'quest-d', 'quest-a'])
  })

  it('golden value — week 2026-07-27', () => {
    const result = pickWeeklyQuests(pool, '2026-07-27', 3)
    expect(result.map((q) => q.key)).toEqual(['quest-a', 'quest-b', 'quest-c'])
  })
})
