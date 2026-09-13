/**
 * Plafond journalier d'achats de packs d'énergie : la valeur de config plus
 * les paliers de la compétence Opulence. Extrait du domaine pour que la règle
 * soit testable sans base — `#checkEnergyDailyCap` ne fait plus que compter
 * les achats du jour et comparer.
 */
export function effectiveEnergyDailyCap(
  baseCap: number,
  capBonus: number,
): number {
  return Math.max(0, baseCap + capBonus)
}
