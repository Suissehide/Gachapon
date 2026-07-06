import type { CardRarity } from '../../types/domain/gacha/gacha.types'

const RARITY_ORDER: CardRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

/** Taux de drop de base par rareté (hors bonus de chance), en pourcentage. */
export function computeDropRates(
  cards: ReadonlyArray<{ rarity: CardRarity; dropWeight: number }>,
): Array<{ rarity: CardRarity; pct: number }> {
  const total = cards.reduce((sum, c) => sum + c.dropWeight, 0)
  return RARITY_ORDER.map((rarity) => {
    if (total <= 0) {
      return { rarity, pct: 0 }
    }
    const weight = cards
      .filter((c) => c.rarity === rarity)
      .reduce((sum, c) => sum + c.dropWeight, 0)
    return { rarity, pct: Math.round((weight / total) * 10000) / 100 }
  })
}
