import type { LogEntry } from '../combat/battle-simulator.domain'
import { mondayOfUtcWeek } from '../quests/quest-matching'
import type { TowerElement } from '../tower/tower-slots'

/** Ordre de rotation hebdomadaire des boss (§ Boss de la spec). */
export const RAID_ROTATION: readonly TowerElement[] = [
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
]

/**
 * Lundi de la semaine qui contient le 1er janvier 2026. La semaine 0 est
 * FIRE, et le compteur ne repart jamais à zéro au changement d'année (pas
 * de numéro de semaine ISO, ambigu à cheval sur deux années).
 */
export const RAID_EPOCH_WEEK_KEY = mondayOfUtcWeek(
  new Date(Date.UTC(2026, 0, 1)),
)

export const RAID_TIER_PCTS = [25, 50, 75, 100] as const

/** PV simulés du boss : jamais atteints en 10 tours, la bataille finit en TIMEOUT ou par la mort des alliés. */
export const RAID_BOSS_SIM_HP = 1_000_000_000

export const MAX_RAID_TEAM_SIZE = 3

/** Le boss est la seule unité du camp B. */
export const RAID_BOSS_UNIT_ID = 'B0'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

function weekKeyToMs(weekKey: string): number {
  return Date.parse(`${weekKey}T00:00:00.000Z`)
}

export function raidWeekKey(now: Date): string {
  return mondayOfUtcWeek(now)
}

export function raidWeekEndsAt(weekKey: string): Date {
  return new Date(weekKeyToMs(weekKey) + WEEK_MS)
}

export function raidWeekIndex(weekKey: string): number {
  return Math.round(
    (weekKeyToMs(weekKey) - weekKeyToMs(RAID_EPOCH_WEEK_KEY)) / WEEK_MS,
  )
}

export function raidElementForWeek(weekKey: string): TowerElement {
  const n = RAID_ROTATION.length
  const idx = ((raidWeekIndex(weekKey) % n) + n) % n
  return RAID_ROTATION[idx] as TowerElement
}

export function raidMaxHp(baseHpPerMember: number, memberCount: number): number {
  return Math.max(1, Math.round(baseHpPerMember * Math.max(1, memberCount)))
}

/**
 * Somme des dégâts finaux infligés par le camp A à l'unité boss. Les
 * esquives ont `final: 0`, les frappes du boss (attackerId 'B…') et les
 * dégâts sur d'autres cibles sont ignorés.
 */
export function damageDealtToBoss(
  log: LogEntry[],
  bossId: string = RAID_BOSS_UNIT_ID,
): number {
  let total = 0
  for (const entry of log) {
    if (entry.type !== 'ATTACK' || !entry.attackerId.startsWith('A')) {
      continue
    }
    for (const d of entry.damages) {
      if (d.id === bossId) {
        total += d.final
      }
    }
  }
  return total
}

/** Paliers atteints pour `damageDone` sur `maxHp` (comparaison entière, sans flottant). */
export function crossedTiers<T extends { pct: number }>(
  damageDone: number,
  maxHp: number,
  tiers: T[],
): T[] {
  return tiers.filter((t) => damageDone * 100 >= t.pct * maxHp)
}

export function utcDayStart(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export function attacksRemaining(used: number, perDay: number): number {
  return Math.max(0, perDay - used)
}
