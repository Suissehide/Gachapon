/**
 * Pure quest-matching functions — no side effects, no dependencies.
 *
 * Cache note: `pickWeeklyQuests` is deterministic and cheap (in-memory sort +
 * Fisher-Yates). The active-quest pool is cached at the domain level
 * (`QuestsDomain`) with a TTL of 60 s per periodKey. Admin CRUD invalidates
 * the cache naively via TTL expiry — changes take effect within 60 s.
 */

import type { CardRarity } from '../../../generated/enums'
import type {
  AchievementEvent,
  AchievementEventKind,
} from '../achievements/events.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestCriterion {
  /** The AchievementEvent kind this quest tracks. */
  event: AchievementEventKind
  /** Progress needed to complete the quest. */
  target: number
  filter?: {
    /** If set, only PULL_COMPLETED events with this rarity count. */
    rarity?: CardRarity
    /** If true, only PULL_COMPLETED events where wasDuplicate === false count. */
    uniqueOnly?: boolean
  }
}

// ---------------------------------------------------------------------------
// questIncrement
// ---------------------------------------------------------------------------

/**
 * Returns how much progress the event contributes to the criterion.
 * - Returns 0 if the event kind doesn't match criterion.event.
 * - Returns 0 if the rarity filter is set and event.rarity doesn't match.
 * - Returns 0 if uniqueOnly is true and event.wasDuplicate !== false.
 * - Otherwise returns `event.amount ?? 1`.
 */
export function questIncrement(
  criterion: QuestCriterion,
  event: AchievementEvent,
): number {
  if (event.kind !== criterion.event) {
    return 0
  }

  if (criterion.filter?.rarity !== undefined) {
    if (
      !('rarity' in event) ||
      (event as { rarity: string }).rarity !== criterion.filter.rarity
    ) {
      return 0
    }
  }

  if (criterion.filter?.uniqueOnly === true) {
    if (
      !('wasDuplicate' in event) ||
      (event as { wasDuplicate: boolean }).wasDuplicate !== false
    ) {
      return 0
    }
  }

  return 'amount' in event ? (event as { amount: number }).amount : 1
}

// ---------------------------------------------------------------------------
// mondayOfUtcWeek
// ---------------------------------------------------------------------------

/**
 * Returns the ISO date string (YYYY-MM-DD) of the Monday 00:00 UTC that starts
 * the ISO week containing `now`.
 *
 * Note: Sunday (getUTCDay() === 0) belongs to the PREVIOUS ISO week, so we
 * subtract 6 days to reach the previous Monday.
 */
export function mondayOfUtcWeek(now: Date): string {
  const day = now.getUTCDay() // 0=Sunday, 1=Monday, …, 6=Saturday
  // Days to subtract to land on the Monday of the current ISO week.
  // Sunday (0) → 6 (go to previous Monday), Monday (1) → 0, …, Saturday (6) → 5
  const daysToSubtract = day === 0 ? 6 : day - 1

  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  monday.setUTCDate(monday.getUTCDate() - daysToSubtract)

  return monday.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// pickWeeklyQuests
// ---------------------------------------------------------------------------

/**
 * Deterministically picks `count` quests from `pool` for the given `periodKey`.
 *
 * Algorithm:
 *  1. Sort pool by key (ascending) — ensures output is stable regardless of
 *     the order in which the caller provides the pool.
 *  2. Hash periodKey → 32-bit unsigned seed.
 *  3. Run Fisher-Yates shuffle with a mulberry32 PRNG seeded by (2).
 *  4. Return the first `count` elements.
 *
 * If `pool.length <= count`, the sorted pool is returned as-is.
 */
export function pickWeeklyQuests<T extends { key: string }>(
  pool: T[],
  periodKey: string,
  count = 3,
): T[] {
  // Sort by key for deterministic base order
  const sorted = [...pool].sort((a, b) => a.key.localeCompare(b.key))

  if (sorted.length <= count) {
    return sorted
  }

  const rng = mulberry32(hashString(periodKey))

  // Fisher-Yates shuffle (in-place on sorted copy)
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    // biome-ignore lint/style/noNonNullAssertion: indices are always in bounds
    ;[sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!]
  }

  return sorted.slice(0, count)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** djb2-inspired string hash → unsigned 32-bit integer. */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash, 33) ^ str.charCodeAt(i)) >>> 0
  }
  return hash
}

/** mulberry32 PRNG — fast, good distribution, 32-bit state. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
