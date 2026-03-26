/** Converts total XP to level. Level = floor(sqrt(xp / 100)) + 1, capped at 100. */
export function calculateLevel(xp: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / 100)) + 1, 100)
}
