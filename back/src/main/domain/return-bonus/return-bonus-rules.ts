export type ReturnBonusConfig = {
  minDays: number
  maxDays: number
  tokensPerDay: number
  energyPerDay: number
}

/** `days` = jours réels d'absence ; `cappedDays` = jours qui comptent pour le cadeau. */
export type ReturnChestAmounts = {
  days: number
  cappedDays: number
  tokens: number
  energy: number
}

/** Pure : contenu du coffre de retour pour un écart en jours UTC, ou null sous le seuil. */
export function computeReturnChest(
  dayGap: number,
  cfg: ReturnBonusConfig,
): ReturnChestAmounts | null {
  if (dayGap < cfg.minDays) {
    return null
  }
  const cappedDays = Math.min(dayGap, cfg.maxDays)
  return {
    days: dayGap,
    cappedDays,
    tokens: cfg.tokensPerDay * cappedDays,
    energy: cfg.energyPerDay * cappedDays,
  }
}
