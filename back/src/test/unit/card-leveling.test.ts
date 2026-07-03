import { describe, expect, it } from '@jest/globals'

import {
  dustCostNextLevel,
  goldCostNextLevel,
  isAtTopOfPalier,
  maxLevelInPalier,
  RARITY_MULT,
  statAtLevel,
  totalDustCost,
  totalGoldCost,
} from '../../main/domain/card-leveling/card-leveling.domain'

describe('card-leveling pure domain', () => {
  describe('maxLevelInPalier', () => {
    it('returns 10 × palier', () => {
      expect(maxLevelInPalier(1)).toBe(10)
      expect(maxLevelInPalier(3)).toBe(30)
      expect(maxLevelInPalier(6)).toBe(60)
    })
  })

  describe('isAtTopOfPalier', () => {
    it('true when level == 10·palier', () => {
      expect(isAtTopOfPalier(10, 1)).toBe(true)
      expect(isAtTopOfPalier(20, 2)).toBe(true)
      expect(isAtTopOfPalier(60, 6)).toBe(true)
    })
    it('false otherwise', () => {
      expect(isAtTopOfPalier(9, 1)).toBe(false)
      expect(isAtTopOfPalier(11, 2)).toBe(false)
    })
  })

  describe('goldCostNextLevel', () => {
    it('uses formula 5 × n^1.6 × multRareté', () => {
      // n=1, COMMON: round(5 × 1 × 1.0) = 5
      expect(goldCostNextLevel(1, 'COMMON')).toBe(5)
      // n=1, RARE: round(5 × 1 × 1.7) = round(8.5) = 9
      expect(goldCostNextLevel(1, 'RARE')).toBe(9)
      // n=10, LEGENDARY: round(5 × 10^1.6 × 3.0) = round(5 × 39.81 × 3.0) ≈ 597
      // 10^1.6 = 39.8107…
      expect(goldCostNextLevel(10, 'LEGENDARY')).toBe(
        Math.round(5 * Math.pow(10, 1.6) * 3.0),
      )
    })
    it('is monotonically increasing with level (same rarity)', () => {
      const prev = goldCostNextLevel(5, 'EPIC')
      const next = goldCostNextLevel(6, 'EPIC')
      expect(next).toBeGreaterThan(prev)
    })
    it('is monotonically increasing with rarity (same level)', () => {
      const c = goldCostNextLevel(5, 'COMMON')
      const u = goldCostNextLevel(5, 'UNCOMMON')
      const r = goldCostNextLevel(5, 'RARE')
      const e = goldCostNextLevel(5, 'EPIC')
      const l = goldCostNextLevel(5, 'LEGENDARY')
      expect(u).toBeGreaterThan(c)
      expect(r).toBeGreaterThan(u)
      expect(e).toBeGreaterThan(r)
      expect(l).toBeGreaterThan(e)
    })
    it('accepts custom base/exp params', () => {
      expect(goldCostNextLevel(10, 'COMMON', 10, 2)).toBe(1000)
    })
  })

  describe('dustCostNextLevel', () => {
    it('uses formula 0.5 × n^1.4 × multRareté (nouvelle économie)', () => {
      // n=1, COMMON: round(0.5 × 1 × 1.0) = 1 (Math.round(0.5) → 1)
      expect(dustCostNextLevel(1, 'COMMON')).toBe(1)
      // n=10, LEGENDARY: round(0.5 × 10^1.4 × 3.0)
      expect(dustCostNextLevel(10, 'LEGENDARY')).toBe(
        Math.round(0.5 * Math.pow(10, 1.4) * 3.0),
      )
    })
    it('accepts custom base/exp params', () => {
      expect(dustCostNextLevel(10, 'COMMON', 8, 1.4)).toBe(
        Math.round(8 * Math.pow(10, 1.4)),
      )
    })
  })

  describe('total costs', () => {
    it('sums per-level costs', () => {
      const sum =
        goldCostNextLevel(1, 'RARE') +
        goldCostNextLevel(2, 'RARE') +
        goldCostNextLevel(3, 'RARE')
      expect(totalGoldCost(1, 4, 'RARE')).toBe(sum)
    })
    it('returns 0 when from == to', () => {
      expect(totalGoldCost(5, 5, 'EPIC')).toBe(0)
      expect(totalDustCost(5, 5, 'EPIC')).toBe(0)
    })
  })

  describe('statAtLevel', () => {
    it('returns base at level 1 (no growth)', () => {
      expect(statAtLevel(100, 1)).toBe(100)
    })
    it('applies +6% per level beyond 1', () => {
      // level 10 = 100 × (1 + 0.06 × 9) = 100 × 1.54 = 154
      expect(statAtLevel(100, 10)).toBeCloseTo(154, 5)
      // level 60 = 100 × (1 + 0.06 × 59) = 100 × 4.54 = 454
      expect(statAtLevel(100, 60)).toBeCloseTo(454, 5)
    })
  })

  describe('RARITY_MULT', () => {
    it('is sorted ascending', () => {
      expect(RARITY_MULT.COMMON).toBeLessThan(RARITY_MULT.UNCOMMON)
      expect(RARITY_MULT.UNCOMMON).toBeLessThan(RARITY_MULT.RARE)
      expect(RARITY_MULT.RARE).toBeLessThan(RARITY_MULT.EPIC)
      expect(RARITY_MULT.EPIC).toBeLessThan(RARITY_MULT.LEGENDARY)
    })
  })
})
