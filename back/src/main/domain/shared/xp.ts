/**
 * Courbe d'XP arithmétique : passer du niveau n au niveau n+1 coûte
 * `base + slope·(n−1)` XP. Défauts alignés sur la config
 * (`xp.base`, `xp.slope`, `xp.levelCap`).
 */

/** XP totale cumulée requise pour ATTEINDRE `level` (level 1 = 0). */
export function xpForLevel(level: number, base = 100, slope = 30): number {
  const m = level - 1
  return base * m + (slope * m * (m - 1)) / 2
}

/** Convertit une XP totale en niveau, borné à `cap`. */
export function calculateLevel(
  xp: number,
  base = 100,
  slope = 30,
  cap = 100,
): number {
  let level = 1
  while (level < cap && xp >= xpForLevel(level + 1, base, slope)) {
    level += 1
  }
  return level
}

/**
 * Niveau à ÉCRIRE après un gain d'XP — jamais inférieur au niveau déjà atteint.
 *
 * Durcir la courbe (`xp.base`/`xp.slope`) recalcule un niveau PLUS BAS pour la
 * même XP. Or `skillPointsGained` compare au niveau STOCKÉ : un niveau qui
 * redescend fait regagner au joueur, en remontant, les points de compétence
 * qu'il a déjà dépensés. Ce plancher est la seule garantie qu'un futur
 * rééquilibrage de la courbe ne distribue pas de points en double.
 */
export function levelAfterXpGain(
  currentLevel: number,
  xp: number,
  base: number,
  slope: number,
  cap: number,
): number {
  return Math.max(currentLevel, calculateLevel(xp, base, slope, cap))
}
