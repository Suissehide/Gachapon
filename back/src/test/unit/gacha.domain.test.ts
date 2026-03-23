import { describe, expect, it, jest } from '@jest/globals'
import { pickWeightedRandom, pickVariant } from '../../main/domain/gacha/gacha.domain'
import type { CardWithSet } from '../../main/types/domain/gacha/gacha.types'

function makeCard(name: string, weight: number, rarity = 'COMMON'): CardWithSet {
  return {
    id: name,
    name,
    rarity: rarity as any,
    dropWeight: weight,
    imageUrl: '',
    setId: 'set1',
    createdAt: new Date(),
    set: { id: 'set1', name: 'Test', description: null, coverImage: null, isActive: true, createdAt: new Date() },
  }
}

describe('pickWeightedRandom', () => {
  it('retourne toujours une carte de la liste', () => {
    const cards = [makeCard('A', 10), makeCard('B', 5), makeCard('C', 1)]
    for (let i = 0; i < 100; i++) {
      const result = pickWeightedRandom(cards)
      expect(['A', 'B', 'C']).toContain(result.name)
    }
  })

  it('retourne la seule carte si liste de taille 1', () => {
    const cards = [makeCard('Solo', 99)]
    expect(pickWeightedRandom(cards).name).toBe('Solo')
  })

  it('respecte approximativement les poids (test statistique grossier)', () => {
    const cards = [makeCard('Heavy', 90), makeCard('Light', 10)]
    let heavyCount = 0
    for (let i = 0; i < 1000; i++) {
      if (pickWeightedRandom(cards).name === 'Heavy') heavyCount++
    }
    // ~90% avec une tolérance de ±10%
    expect(heavyCount).toBeGreaterThan(750)
    expect(heavyCount).toBeLessThan(950)
  })

  it('throw si liste vide', () => {
    expect(() => pickWeightedRandom([])).toThrow()
  })
})

const RATES = {
  brilliantRateRare: 2, brilliantRateEpic: 3, brilliantRateLegendary: 5,
  holoRateRare: 5, holoRateEpic: 8, holoRateLegendary: 10,
}

describe('pickVariant', () => {
  afterEach(() => jest.restoreAllMocks())

  it('retourne null pour COMMON', () => {
    expect(pickVariant('COMMON', RATES)).toBeNull()
  })

  it('retourne null pour UNCOMMON', () => {
    expect(pickVariant('UNCOMMON', RATES)).toBeNull()
  })

  it('retourne BRILLIANT si roll < brilliantRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01) // roll = 1 < 2
    expect(pickVariant('RARE', RATES)).toBe('BRILLIANT')
  })

  it('retourne HOLOGRAPHIC si brilliantRate <= roll < brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll = 4, 2<=4<7
    expect(pickVariant('RARE', RATES)).toBe('HOLOGRAPHIC')
  })

  it('retourne null si roll >= brilliantRate + holoRate', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.10) // roll = 10 >= 7
    expect(pickVariant('RARE', RATES)).toBeNull()
  })

  it('utilise les bons taux selon la rareté (LEGENDARY)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.04) // roll=4, brilliantLegendary=5 → BRILLIANT
    expect(pickVariant('LEGENDARY', RATES)).toBe('BRILLIANT')
  })
})
