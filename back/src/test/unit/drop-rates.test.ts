import { describe, expect, it } from '@jest/globals'

import { computeDropRates } from '../../main/domain/gacha/drop-rates'

describe('computeDropRates', () => {
  it('aggregates weights per rarity into percentages in canonical order', () => {
    const rates = computeDropRates([
      { rarity: 'COMMON', dropWeight: 55 },
      { rarity: 'UNCOMMON', dropWeight: 25 },
      { rarity: 'RARE', dropWeight: 13 },
      { rarity: 'EPIC', dropWeight: 5.5 },
      { rarity: 'LEGENDARY', dropWeight: 1.5 },
    ])
    expect(rates).toEqual([
      { rarity: 'COMMON', pct: 55 },
      { rarity: 'UNCOMMON', pct: 25 },
      { rarity: 'RARE', pct: 13 },
      { rarity: 'EPIC', pct: 5.5 },
      { rarity: 'LEGENDARY', pct: 1.5 },
    ])
  })

  it('sums multiple cards of the same rarity and rounds to 2 decimals', () => {
    const rates = computeDropRates([
      { rarity: 'COMMON', dropWeight: 1 },
      { rarity: 'COMMON', dropWeight: 1 },
      { rarity: 'RARE', dropWeight: 1 },
    ])
    expect(rates.find((r) => r.rarity === 'COMMON')?.pct).toBe(66.67)
    expect(rates.find((r) => r.rarity === 'RARE')?.pct).toBe(33.33)
    expect(rates.find((r) => r.rarity === 'EPIC')?.pct).toBe(0)
  })

  it('returns all-zero rates when there are no cards', () => {
    expect(computeDropRates([])).toEqual([
      { rarity: 'COMMON', pct: 0 },
      { rarity: 'UNCOMMON', pct: 0 },
      { rarity: 'RARE', pct: 0 },
      { rarity: 'EPIC', pct: 0 },
      { rarity: 'LEGENDARY', pct: 0 },
    ])
  })
})
