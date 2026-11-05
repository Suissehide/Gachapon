import type { CardVariant } from '../../types/domain/gacha/gacha.types'

/**
 * Bonus de stats (PV/ATK/DEF de base) de chaque vernis débloqué. Le NORMAL est
 * implicite et neutre ; brillant et holo se CUMULENT (×1,08 × ×1,15 ≈ ×1,242).
 */
export const FINISH_MULT: Record<CardVariant, number> = {
  NORMAL: 1,
  BRILLIANT: 1.08,
  HOLOGRAPHIC: 1.15,
}

const FINISH_ORDER: CardVariant[] = ['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC']

export function finishMultiplier(finishes: readonly CardVariant[]): number {
  return [...new Set(finishes)].reduce((m, f) => m * FINISH_MULT[f], 1)
}

/** Le vernis le plus rare débloqué (NORMAL si aucun). */
export function bestFinish(finishes: readonly CardVariant[]): CardVariant {
  return FINISH_ORDER.findLast((f) => finishes.includes(f)) ?? 'NORMAL'
}

/** Vrai si `finish` est affichable : le NORMAL l'est toujours. */
export function hasFinish(
  finishes: readonly CardVariant[],
  finish: CardVariant,
): boolean {
  return finish === 'NORMAL' || finishes.includes(finish)
}
