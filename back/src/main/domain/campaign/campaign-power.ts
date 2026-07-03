type EnemyStats = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
}

/** Même formule que l'affichage front (hp/4 + atk×1,5 + def + spd), sommée sur l'équipe. */
export function computeTeamPower(team: EnemyStats[]): number {
  return team.reduce(
    (sum, e) =>
      sum + Math.round(e.baseHp / 4 + e.baseAtk * 1.5 + e.baseDef + e.baseSpd),
    0,
  )
}
