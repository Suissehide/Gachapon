// front/src/components/profile/arcade/utils.ts

/** Returns the labels and ISO day-of-week for the current week, Monday-first. */
export function weekDays(today = new Date()): Array<{ label: string; isToday: boolean; dow: number }> {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayDow = (today.getUTCDay() + 6) % 7 // Monday = 0
  return labels.map((label, i) => ({ label, dow: i, isToday: i === todayDow }))
}

/** True if `lastLoginAt` is the same UTC day as today. */
export function isLoggedInToday(lastLoginAt: string | Date | null): boolean {
  if (!lastLoginAt) {
    return false
  }
  const last = new Date(lastLoginAt)
  const now = new Date()
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  )
}

export const RARITY_COLORS = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
} as const

export type ArcadeRarity = keyof typeof RARITY_COLORS
