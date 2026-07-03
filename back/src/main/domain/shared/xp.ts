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
