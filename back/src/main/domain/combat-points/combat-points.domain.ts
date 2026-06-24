export interface CombatPointsState {
  combatPoints: number
  newLastCombatPointAt: Date
  nextCombatPointAt: Date | null
}

/**
 * Calcul lazy des combat points (PC) accumulés depuis lastCombatPointAt.
 * Si lastCombatPointAt est null : on initialise le clock à maintenant
 * (aucun PC gagné, regen démarre).
 * Ne fait aucun IO — pur calcul.
 *
 * Mirror exact de calculateTokens (economy.domain) mais en secondes
 * et avec un nommage spécifique aux combat points.
 */
export function calculateCombatPoints(
  lastCombatPointAt: Date | null,
  currentPoints: number,
  regenIntervalSeconds: number,
  maxStock: number,
): CombatPointsState {
  // Déjà au max → pas de regen, pas de nextCombatPointAt.
  // On reset lastCombatPointAt à maintenant pour que le clock reparte
  // de zéro si un PC est ensuite consommé.
  if (currentPoints >= maxStock) {
    return {
      combatPoints: currentPoints,
      newLastCombatPointAt: new Date(),
      nextCombatPointAt: null,
    }
  }

  const ref = lastCombatPointAt ?? new Date()
  if (!lastCombatPointAt) {
    const next = new Date(ref.getTime() + regenIntervalSeconds * 1000)
    return {
      combatPoints: currentPoints,
      newLastCombatPointAt: ref,
      nextCombatPointAt: next,
    }
  }

  const now = Date.now()
  const msPer = regenIntervalSeconds * 1000
  const elapsed = now - ref.getTime()
  const gained = Math.floor(elapsed / msPer)

  if (gained <= 0) {
    const next = new Date(ref.getTime() + msPer)
    return {
      combatPoints: currentPoints,
      newLastCombatPointAt: ref,
      nextCombatPointAt: next,
    }
  }

  const newPoints = Math.min(currentPoints + gained, maxStock)
  const actualGained = newPoints - currentPoints
  // Si la regen amène au max, reset le clock à maintenant.
  const newLast =
    newPoints >= maxStock
      ? new Date()
      : new Date(ref.getTime() + actualGained * msPer)
  const next =
    newPoints >= maxStock ? null : new Date(newLast.getTime() + msPer)

  return {
    combatPoints: newPoints,
    newLastCombatPointAt: newLast,
    nextCombatPointAt: next,
  }
}
