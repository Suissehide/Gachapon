import type { DummySpec } from '../api/combat.api.ts'
import { dummyListSchema } from '../constants/dummy.constant.ts'

/** Un essai contre les mannequins, tel que gardé dans le navigateur. */
export type DummyTry = {
  /** Numéro d'essai, croissant par joueur. */
  n: number
  at: number
  dummies: DummySpec[]
  /** Élément de chaque carte de l'équipe (null = neutre). */
  team: (string | null)[]
  totalDamage: number
  turns: number
  damageByDummy: number[]
}

const MAX_TRIES = 20
const storageKey = (userId: string) => `dummy-history:${userId}`

// ponytail: localStorage, l'historique ne suit pas le joueur d'un appareil à
// l'autre ; un endpoint le jour où il doit le suivre.
export function readDummyHistory(userId: string): DummyTry[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(storageKey(userId)) ?? '[]',
    )
    return Array.isArray(parsed) ? (parsed as DummyTry[]) : []
  } catch {
    return []
  }
}

/** Ajoute l'essai en tête de liste (plus récent d'abord). */
export function pushDummyTry(userId: string, entry: Omit<DummyTry, 'n'>) {
  const list = readDummyHistory(userId)
  const next = [{ ...entry, n: (list[0]?.n ?? 0) + 1 }, ...list]
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify(next.slice(0, MAX_TRIES)),
    )
  } catch {
    // Stockage bloqué ou plein : l'essai n'est simplement pas gardé.
  }
}

const settingsKey = (userId: string) => `dummy-settings:${userId}`

/** Derniers réglages des mannequins, null si absents ou illisibles. */
export function readDummySettings(userId: string): DummySpec[] | null {
  try {
    const parsed = dummyListSchema.safeParse(
      JSON.parse(localStorage.getItem(settingsKey(userId)) ?? 'null'),
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function saveDummySettings(userId: string, dummies: DummySpec[]) {
  try {
    localStorage.setItem(settingsKey(userId), JSON.stringify(dummies))
  } catch {
    // Stockage bloqué ou plein : les réglages vivent seulement dans l'URL.
  }
}
