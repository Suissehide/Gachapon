import type { CardRarity, CardVariant, ScoringConfig } from '../../../generated/client'

export function calculateUserScore(
  userCards: Array<{ card: { rarity: CardRarity }; variant: CardVariant; quantity: number }>,
  config: ScoringConfig,
): number {
  const rarityPoints: Record<CardRarity, number> = {
    COMMON: config.commonPoints,
    UNCOMMON: config.uncommonPoints,
    RARE: config.rarePoints,
    EPIC: config.epicPoints,
    LEGENDARY: config.legendaryPoints,
  }
  const variantMultiplier: Record<CardVariant, number> = {
    NORMAL: 1.0,
    BRILLIANT: config.brilliantMultiplier,
    HOLOGRAPHIC: config.holographicMultiplier,
  }
  let score = 0
  for (const uc of userCards) {
    if (uc.quantity >= 1) {
      score += rarityPoints[uc.card.rarity] * variantMultiplier[uc.variant]
    }
  }
  return score
}
