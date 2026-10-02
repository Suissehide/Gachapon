import { describe, expect, it } from '@jest/globals'

import {
  ALCHEMY_COST_KEYS,
  ALCHEMY_FROM_RARITIES,
  maxTransmutations,
  nextRarity,
  suggestIngredients,
  validateIngredients,
} from '../../main/domain/alchemy/alchemy-rules'
import { DEFAULTS } from '../../main/infra/config/config.service'

const DUST = {
  COMMON: DEFAULTS.dustCommon,
  UNCOMMON: DEFAULTS.dustUncommon,
  RARE: DEFAULTS.dustRare,
  EPIC: DEFAULTS.dustEpic,
  LEGENDARY: DEFAULTS.dustLegendary,
} as const
const MARKET = {
  COMMON: DEFAULTS.dailyShopPriceCommon,
  UNCOMMON: DEFAULTS.dailyShopPriceUncommon,
  RARE: DEFAULTS.dailyShopPriceRare,
  EPIC: DEFAULTS.dailyShopPriceEpic,
  LEGENDARY: DEFAULTS.dailyShopPriceLegendary,
} as const

const uc = (id: string, quantity: number, rarity = 'COMMON', variant = 'NORMAL') =>
  [id, { id, quantity, variant, card: { rarity } }] as const
const mapOf = (...e: ReturnType<typeof uc>[]) => new Map(e as never)

describe('recettes', () => {
  it('quatre crans, rien depuis LEGENDARY', () => {
    expect(ALCHEMY_FROM_RARITIES).toEqual(['COMMON', 'UNCOMMON', 'RARE', 'EPIC'])
    expect(nextRarity('COMMON')).toBe('UNCOMMON')
    expect(nextRarity('EPIC')).toBe('LEGENDARY')
    expect(nextRarity('LEGENDARY')).toBeNull()
  })

  it('valeurs par défaut 5 / 6 / 8 / 6', () => {
    expect(ALCHEMY_FROM_RARITIES.map((r) => DEFAULTS[ALCHEMY_COST_KEYS[r]])).toEqual([5, 6, 8, 6])
  })

  // Invariant 1 — recycler les ingrédients rapporte plus que recycler le résultat.
  it('aucune boucle de poussière', () => {
    for (const r of ALCHEMY_FROM_RARITIES) {
      const to = nextRarity(r)!
      expect(DEFAULTS[ALCHEMY_COST_KEYS[r]] * DUST[r]).toBeGreaterThan(DUST[to])
    }
  })

  // Invariant 2 — acheter les ingrédients au Marché coûte plus que le résultat.
  it('aucun raccourci par le Marché', () => {
    for (const r of ALCHEMY_FROM_RARITIES) {
      const to = nextRarity(r)!
      expect(DEFAULTS[ALCHEMY_COST_KEYS[r]] * MARKET[r]).toBeGreaterThan(MARKET[to])
    }
  })
})

describe('validateIngredients', () => {
  it('accepte une sélection mélangée exacte', () => {
    expect(() =>
      validateIngredients('COMMON', [
        { userCardId: 'a', amount: 3 },
        { userCardId: 'b', amount: 2 },
      ], mapOf(uc('a', 4), uc('b', 3)), 5),
    ).not.toThrow()
  })

  it('refuse un cran depuis LEGENDARY', () => {
    expect(() => validateIngredients('LEGENDARY', [{ userCardId: 'a', amount: 1 }], mapOf(uc('a', 9, 'LEGENDARY')), 1)).toThrow()
  })

  it('refuse montant nul, négatif ou décimal', () => {
    for (const amount of [0, -1, 1.5]) {
      expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount }], mapOf(uc('a', 9)), 5)).toThrow()
    }
  })

  it('refuse une carte inconnue, d\'une autre rareté, ou non normale', () => {
    expect(() => validateIngredients('COMMON', [{ userCardId: 'z', amount: 5 }], mapOf(uc('a', 9)), 5)).toThrow()
    expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount: 5 }], mapOf(uc('a', 9, 'RARE')), 5)).toThrow()
    expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount: 5 }], mapOf(uc('a', 9, 'COMMON', 'BRILLIANT')), 5)).toThrow()
  })

  it('protège le dernier exemplaire, y compris sur des picks répétés (Review Focus 1)', () => {
    expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount: 5 }], mapOf(uc('a', 5)), 5)).toThrow(/0/)
    expect(() =>
      validateIngredients('COMMON', [
        { userCardId: 'a', amount: 3 },
        { userCardId: 'a', amount: 2 },
      ], mapOf(uc('a', 5)), 5),
    ).toThrow()
    expect(() =>
      validateIngredients('COMMON', [
        { userCardId: 'a', amount: 3 },
        { userCardId: 'a', amount: 2 },
      ], mapOf(uc('a', 6)), 5),
    ).not.toThrow()
  })

  it('refuse un total différent de X', () => {
    expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount: 4 }], mapOf(uc('a', 9)), 5)).toThrow()
    expect(() => validateIngredients('COMMON', [{ userCardId: 'a', amount: 6 }], mapOf(uc('a', 9)), 5)).toThrow()
  })
})

describe('suggestIngredients / maxTransmutations', () => {
  it('prend les piles les plus fournies d\'abord', () => {
    expect(
      suggestIngredients([
        { userCardId: 'a', available: 1 },
        { userCardId: 'b', available: 4 },
        { userCardId: 'c', available: 2 },
      ], 5),
    ).toEqual([
      { userCardId: 'b', amount: 4 },
      { userCardId: 'c', amount: 1 },
    ])
  })

  it('rend null si le stock est insuffisant', () => {
    expect(suggestIngredients([{ userCardId: 'a', available: 4 }], 5)).toBeNull()
  })

  it('compte les transmutations possibles', () => {
    expect(maxTransmutations([{ available: 7 }, { available: 4 }], 5)).toBe(2)
    expect(maxTransmutations([], 5)).toBe(0)
  })
})
