const DAILY_PREFIX = 'day:'

/** Encodes a default (non-milestone) daily streak reward sourceId.
 *  Format: "day:<streakDay>:<utcDate>" — idempotent within the same UTC day,
 *  but unique across streak cycles so a reset allows re-earning the same day. */
export const encodeDailySourceId = (
  day: number,
  date: Date = new Date(),
): string => {
  const utcDate = date.toISOString().slice(0, 10) // "YYYY-MM-DD"
  return `${DAILY_PREFIX}${day}:${utcDate}`
}

/** Returns the streak day for a default daily sourceId, or null for milestone UUIDs. */
export const parseDailySourceId = (sourceId: string): number | null => {
  if (!sourceId.startsWith(DAILY_PREFIX)) {
    return null
  }
  // Support both legacy "day:N" and current "day:N:YYYY-MM-DD" formats
  const rest = sourceId.slice(DAILY_PREFIX.length)
  const day = Number(rest.split(':')[0])
  return Number.isNaN(day) ? null : day
}
