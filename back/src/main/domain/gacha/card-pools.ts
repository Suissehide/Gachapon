import type { Prisma } from '../../../generated/client'

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
