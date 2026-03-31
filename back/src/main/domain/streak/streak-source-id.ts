const DAILY_PREFIX = 'day:'

/** Encodes a default (non-milestone) daily streak reward sourceId.
 *  Uniqueness per (user, day) is the mechanism that makes the upsert idempotent. */
export const encodeDailySourceId = (day: number): string => `${DAILY_PREFIX}${day}`

/** Returns the streak day for a default daily sourceId, or null for milestone UUIDs. */
export const parseDailySourceId = (sourceId: string): number | null => {
  if (!sourceId.startsWith(DAILY_PREFIX)) return null
  const day = Number(sourceId.slice(DAILY_PREFIX.length))
  return isNaN(day) ? null : day
}
