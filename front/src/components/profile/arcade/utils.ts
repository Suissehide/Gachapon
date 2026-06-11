// front/src/components/profile/arcade/utils.ts

/** Stable hue 0–359 derived from a string (FNV-1a). Mirrors backend hashHue. */
export function hashHue(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

/** First 3 letters of the first word, ASCII-folded, uppercase. */
export function deriveShort(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, ' ')
    .trim()
    .split(/\s+/)[0] ?? ''
  return folded.slice(0, 3).toUpperCase()
}

/** Returns the labels and ISO day-of-week for the current week, Monday-first. */
export function weekDays(today = new Date()): Array<{ label: string; isToday: boolean; dow: number }> {
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const todayDow = ((today.getUTCDay() + 6) % 7) // Monday = 0
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
