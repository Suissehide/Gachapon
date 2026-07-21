type EnemyStats = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  attackPattern?: string | null
}

// Prime de menace par pattern d'attaque : un ennemi qui frappe plusieurs
// cibles (ou plus fort) pèse plus lourd que ses stats brutes. Un solo qui tape
// TOUTE l'équipe chaque tour (AOE_3) vaut bien plus que son atk mono-cible :
// il conserve son DPS pendant qu'il use vos 3 unités une à une (avantage de
// focus-fire / action economy). Valeurs calibrées par simulation du combat :
// pour AOE_3, le seuil de victoire réel ≈ atk × 1,5 × 7 dans le terme offensif,
// ce qui aligne la jauge affichée sur la puissance réellement nécessaire (et
// remonte le boss AU-DESSUS du stage normal qui le précède). MULTI_2 (2 cibles)
// et les burst mono-cible (MONO_*) sont interpolés — non utilisés par le seed
// actuel, seuls BASIC (joueur) et AOE_3 (boss) le sont.
const ATTACK_THREAT_MULT: Record<string, number> = {
  BASIC: 1,
  MULTI_2: 3,
  AOE_3: 7,
  MONO_AMPLIFIED: 2,
  MONO_DOUBLE: 2,
}

// Alignée avec le front (cardStats.ts SPD_REF) : la vitesse multiplie le
// rendement sous ATB. SPD_REF = vitesse neutre (×1).
const SPD_REF = 100

function unitPower(e: EnemyStats): number {
  const threat = ATTACK_THREAT_MULT[e.attackPattern ?? 'BASIC'] ?? 1
  return Math.round(
    (e.baseHp / 2 + e.baseAtk * 1.5 * threat + e.baseDef) *
      (e.baseSpd / SPD_REF),
  )
}

/**
 * Puissance affichée d'une équipe ennemie. Même socle que le front
 * (hp/2 + atk×1,5 + def, la vitesse multipliant l'ensemble sous ATB), plus une
 * prime de menace selon le pattern d'attaque (un boss AOE_3 pèse plus lourd).
 */
export function computeTeamPower(team: EnemyStats[]): number {
  return team.reduce((sum, e) => sum + unitPower(e), 0)
}
