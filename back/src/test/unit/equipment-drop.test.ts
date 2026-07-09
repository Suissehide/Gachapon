import { describe, expect, it } from '@jest/globals'

import {
  __test__,
  pickEquipmentForRarity,
  rollFarmCardDrop,
  rollFarmEquipmentDrop,
  rollFirstClearCardRarity,
  rollFirstClearEquipmentRarity,
} from '../../main/domain/combat/equipment-drop.domain'

// Deterministic PRNG that returns a queue of values
function queuedPrng(values: number[]) {
  let i = 0
  return () => {
    const v = values[i % values.length]!
    i++
    return v
  }
}

describe('equipment-drop pure', () => {
  describe('rollFarmEquipmentDrop', () => {
    it('returns null if first roll >= dropChance', () => {
      const loot = {
        gold: 0,
        dust: 0,
        xp: 0,
        equipmentDropChance: 0.15,
        equipmentWeights: { COMMON: 100 },
        cardChance: 0,
      }
      const result = rollFarmEquipmentDrop(loot, queuedPrng([0.9]))
      expect(result).toBeNull()
    })

    it('returns a rarity if first roll < dropChance', () => {
      const loot = {
        gold: 0,
        dust: 0,
        xp: 0,
        equipmentDropChance: 0.5,
        equipmentWeights: { COMMON: 100 },
        cardChance: 0,
      }
      const result = rollFarmEquipmentDrop(loot, queuedPrng([0.1, 0.5]))
      expect(result).toBe('COMMON')
    })

    it('biases toward higher-weight rarities', () => {
      // Run 1000 iterations and assert distribution roughly matches weights
      const loot = {
        gold: 0,
        dust: 0,
        xp: 0,
        equipmentDropChance: 1.0,
        equipmentWeights: { COMMON: 80, UNCOMMON: 20 },
        cardChance: 0,
      }
      let common = 0
      let uncommon = 0
      for (let i = 0; i < 1000; i++) {
        const result = rollFarmEquipmentDrop(loot, Math.random)
        if (result === 'COMMON') common++
        else if (result === 'UNCOMMON') uncommon++
      }
      // Expect ~80/20 ± 5%
      expect(common).toBeGreaterThan(700)
      expect(common).toBeLessThan(900)
      expect(uncommon).toBeGreaterThan(100)
      expect(uncommon).toBeLessThan(300)
    })
  })

  describe('rollFarmCardDrop', () => {
    it('uses cardChance threshold', () => {
      const loot = {
        gold: 0,
        dust: 0,
        xp: 0,
        equipmentDropChance: 0,
        equipmentWeights: {},
        cardChance: 0.05,
      }
      expect(rollFarmCardDrop(loot, queuedPrng([0.04]))).toBe(true)
      expect(rollFarmCardDrop(loot, queuedPrng([0.05]))).toBe(false)
      expect(rollFarmCardDrop(loot, queuedPrng([0.5]))).toBe(false)
    })
  })

  describe('rollFirstClearEquipmentRarity', () => {
    it('returns null when no guaranteed equipment', () => {
      const fc = { gold: 0, dust: 0, xp: 0, guaranteedEquipment: null }
      expect(rollFirstClearEquipmentRarity(fc, Math.random)).toBeNull()
    })

    it('picks among rarities >= minRarity', () => {
      const fc = { gold: 0, dust: 0, xp: 0, guaranteedEquipment: { minRarity: 'RARE' as const } }
      const allowed = ['RARE', 'EPIC', 'LEGENDARY']
      for (let i = 0; i < 100; i++) {
        const r = rollFirstClearEquipmentRarity(fc, Math.random)
        expect(allowed).toContain(r)
      }
    })

    it('makes higher rarities progressively rarer, not uniform (steep curve)', () => {
      // minRarity COMMON => full pool. LEGENDARY must be super rare (< 2%),
      // COMMON dominant. Uniform (the old bug) would give ~20% legendary.
      const fc = { gold: 0, dust: 0, xp: 0, guaranteedEquipment: { minRarity: 'COMMON' as const } }
      const counts: Record<string, number> = {}
      const N = 20000
      for (let i = 0; i < N; i++) {
        const r = rollFirstClearEquipmentRarity(fc, Math.random)!
        counts[r] = (counts[r] ?? 0) + 1
      }
      const legendaryRate = (counts.LEGENDARY ?? 0) / N
      expect(legendaryRate).toBeLessThan(0.02)
      expect(counts.COMMON!).toBeGreaterThan(counts.UNCOMMON!)
      expect(counts.UNCOMMON!).toBeGreaterThan(counts.RARE!)
      expect(counts.RARE!).toBeGreaterThan(counts.EPIC!)
      expect(counts.EPIC!).toBeGreaterThan(counts.LEGENDARY ?? 0)
    })
  })

  describe('rollFirstClearCardRarity', () => {
    it('returns null without guaranteedCard', () => {
      const fc = { gold: 0, dust: 0, xp: 0, guaranteedCard: null }
      expect(rollFirstClearCardRarity(fc, Math.random)).toBeNull()
    })

    it('picks at or above minRarity', () => {
      const fc = { gold: 0, dust: 0, xp: 0, guaranteedCard: { minRarity: 'EPIC' as const } }
      const allowed = ['EPIC', 'LEGENDARY']
      for (let i = 0; i < 50; i++) {
        const r = rollFirstClearCardRarity(fc, Math.random)
        expect(allowed).toContain(r)
      }
    })
  })

  describe('pickEquipmentForRarity', () => {
    const pool = [
      { id: 'a', dropWeight: 50, rarity: 'COMMON' as const },
      { id: 'b', dropWeight: 50, rarity: 'COMMON' as const },
      { id: 'c', dropWeight: 100, rarity: 'UNCOMMON' as const },
    ]

    it('returns null when no candidates match', () => {
      expect(pickEquipmentForRarity(pool, 'EPIC', Math.random)).toBeNull()
    })

    it('returns null on empty pool', () => {
      expect(pickEquipmentForRarity([], 'COMMON', Math.random)).toBeNull()
    })

    it('biases by dropWeight', () => {
      const lopsided = [
        { id: 'a', dropWeight: 90, rarity: 'COMMON' as const },
        { id: 'b', dropWeight: 10, rarity: 'COMMON' as const },
      ]
      let a = 0
      let b = 0
      for (let i = 0; i < 1000; i++) {
        const picked = pickEquipmentForRarity(lopsided, 'COMMON', Math.random)
        if (picked?.id === 'a') a++
        else if (picked?.id === 'b') b++
      }
      expect(a).toBeGreaterThan(800)
      expect(b).toBeLessThan(200)
    })
  })

  describe('pickWeightedRarity (internal)', () => {
    it('falls back to COMMON when all weights are 0', () => {
      expect(__test__.pickWeightedRarity({}, Math.random)).toBe('COMMON')
    })
  })
})
