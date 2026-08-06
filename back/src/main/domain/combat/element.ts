/**
 * Roue élémentaire (indépendante des familles).
 *
 * Cycle de 4 : FIRE ▶ NATURE ▶ EARTH ▶ WATER ▶ FIRE (chacun bat le suivant).
 *   le feu brûle la nature, la nature fissure la terre,
 *   la terre absorbe l'eau, l'eau éteint le feu.
 * Paire opposée : LIGHT ⇄ DARK (se battent mutuellement).
 *
 * L'élément est découplé de Prisma : le simulateur manipule des `string | null`
 * (comme `passiveKey`). Un `null`/élément inconnu = interactions neutres.
 */
export type Element = 'FIRE' | 'WATER' | 'NATURE' | 'EARTH' | 'LIGHT' | 'DARK'

export const ELEMENTS: readonly Element[] = [
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
  'LIGHT',
  'DARK',
]

/** Pour chaque élément, l'élément qu'il bat (avantage). */
const BEATS: Record<Element, Element> = {
  FIRE: 'NATURE',
  NATURE: 'EARTH',
  EARTH: 'WATER',
  WATER: 'FIRE',
  LIGHT: 'DARK',
  DARK: 'LIGHT',
}

function isElement(value: string | null | undefined): value is Element {
  return value != null && value in BEATS
}

export type ElementRelation = 'ADVANTAGE' | 'DISADVANTAGE' | 'NEUTRAL'

/** Relation de l'attaquant vis-à-vis de la cible. */
export function elementRelation(
  attacker: string | null | undefined,
  target: string | null | undefined,
): ElementRelation {
  if (!isElement(attacker) || !isElement(target)) {
    return 'NEUTRAL'
  }
  if (BEATS[attacker] === target) {
    return 'ADVANTAGE'
  }
  if (BEATS[target] === attacker) {
    return 'DISADVANTAGE'
  }
  return 'NEUTRAL'
}

/**
 * Multiplicateur de dégâts appliqué selon la relation élémentaire.
 * @param advantageMult   dégâts en avantage (défaut 1.3)
 * @param disadvantageMult dégâts en désavantage (défaut 0.75)
 */
export function elementMultiplier(
  attacker: string | null | undefined,
  target: string | null | undefined,
  advantageMult = 1.3,
  disadvantageMult = 0.75,
): number {
  switch (elementRelation(attacker, target)) {
    case 'ADVANTAGE':
      return advantageMult
    case 'DISADVANTAGE':
      return disadvantageMult
    default:
      return 1
  }
}
