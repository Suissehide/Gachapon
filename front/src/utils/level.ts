export interface XpCurve {
  base: number
  slope: number
  levelCap: number
}

/** XP totale cumulée requise pour ATTEINDRE `level` (miroir exact du back). */
export function xpForLevel(level: number, cfg: XpCurve): number {
  const m = level - 1
  return cfg.base * m + (cfg.slope * m * (m - 1)) / 2
}

export function computeLevel(xp: number, cfg: XpCurve): number {
  let level = 1
  while (level < cfg.levelCap && xp >= xpForLevel(level + 1, cfg)) {
    level += 1
  }
  return level
}
