import type { Prisma } from '../../../generated/client'
import { mondayOfUtcWeek, pickWeeklyQuests } from '../quests/quest-matching'

/** Éléments réservés à la capsule astrale : exclus de toutes les sources de
 * production (tirage, boutique du jour, commandes, alchimie, cartes de
 * combat), gardés pour les récompenses, la carte garantie de boss et la
 * complétion de collection. */
export const ASTRAL_ELEMENTS = ['LIGHT', 'DARK'] as const

export function isAstralElement(element: string | null | undefined): boolean {
  return (ASTRAL_ELEMENTS as readonly string[]).includes(element ?? '')
}

// `OR` sur `element: null` voulu : en SQL, `NOT IN` écarte aussi les NULL,
// ce qui exclurait à tort les cartes sans élément du pool normal.
export const NORMAL_POOL_WHERE: Prisma.CardWhereInput = {
  set: { isActive: true },
  OR: [{ element: null }, { element: { notIn: [...ASTRAL_ELEMENTS] } }],
}

export const ASTRAL_POOL_WHERE: Prisma.CardWhereInput = {
  set: { isActive: true },
  element: { in: [...ASTRAL_ELEMENTS] },
}

export const ELEMENT_CAPSULE_TYPES = [
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
] as const

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
export const COMET_CARDS_PER_RARITY = 3

/** Sélection du jeton Constellation (type COMET) : 3 cartes par rareté tirées dans le
 * pool normal, graine = lundi de la semaine (UTC). Commune à tous et stable
 * toute la semaine tant que le pool ne change pas.
 * ponytail: recalculée à chaque lecture — ajouter une carte en cours de
 * semaine peut changer la sélection de sa rareté ; figer la liste en table si
 * ça devient gênant. */
export function cometCapsuleCards<T extends { id: string; rarity: string }>(
  normalPool: T[],
  weekKey: string,
): T[] {
  return RARITIES.flatMap((rarity) =>
    pickWeeklyQuests(
      normalPool
        .filter((c) => c.rarity === rarity)
        .map((card) => ({ key: card.id, card })),
      `capsule:${weekKey}:${rarity}`,
      COMET_CARDS_PER_RARITY,
    ).map((e) => e.card),
  )
}

/** Cartes d'une capsule non astrale, prises dans le pool normal (les LIGHT/DARK
 * n'y sont jamais). */
export function capsulePoolOf<
  T extends { id: string; rarity: string; element: string | null },
>(
  type: (typeof ELEMENT_CAPSULE_TYPES)[number] | 'COMET',
  normalPool: T[],
  now: Date,
): T[] {
  return type === 'COMET'
    ? cometCapsuleCards(normalPool, mondayOfUtcWeek(now))
    : normalPool.filter((c) => c.element === type)
}
