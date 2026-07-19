import { describe, expect, it } from '@jest/globals'

import {
  getPassive,
  PASSIVES,
  type PassiveKey,
} from '../../main/domain/combat/passives'

describe('passives', () => {
  describe('VAMPIRISM', () => {
    it('15% at P1, 40% at P6', () => {
      expect(PASSIVES.VAMPIRISM.compute(1).valuePct).toBe(15)
      expect(PASSIVES.VAMPIRISM.compute(6).valuePct).toBe(40)
    })
  })
  describe('AEGIS', () => {
    it('7% at P1, 17% at P6', () => {
      expect(PASSIVES.AEGIS.compute(1).valuePct).toBe(7)
      expect(PASSIVES.AEGIS.compute(6).valuePct).toBe(17)
    })
  })
  describe('BANNER', () => {
    it('9% at P1, 24% at P6', () => {
      expect(PASSIVES.BANNER.compute(1).valuePct).toBe(9)
      expect(PASSIVES.BANNER.compute(6).valuePct).toBe(24)
    })
  })
  describe('RIPOSTE', () => {
    it('12% at P1, 32% at P6', () => {
      expect(PASSIVES.RIPOSTE.compute(1).valuePct).toBe(12)
      expect(PASSIVES.RIPOSTE.compute(6).valuePct).toBe(32)
    })
  })
  describe('REBIRTH', () => {
    it('25% at P1, 50% at P6', () => {
      expect(PASSIVES.REBIRTH.compute(1).valuePct).toBe(25)
      expect(PASSIVES.REBIRTH.compute(6).valuePct).toBe(50)
    })
  })
  describe('EXECUTION', () => {
    it('25% at P1, 50% at P6', () => {
      expect(PASSIVES.EXECUTION.compute(1).valuePct).toBe(25)
      expect(PASSIVES.EXECUTION.compute(6).valuePct).toBe(50)
    })
  })

  describe('BLESSING', () => {
    it('8% at P1, 18% at P6', () => {
      expect(PASSIVES.BLESSING.compute(1).valuePct).toBe(8)
      expect(PASSIVES.BLESSING.compute(6).valuePct).toBe(18)
    })
  })
  describe('SANCTUARY', () => {
    it('4% at P1, 9% at P6', () => {
      expect(PASSIVES.SANCTUARY.compute(1).valuePct).toBe(4)
      expect(PASSIVES.SANCTUARY.compute(6).valuePct).toBe(9)
    })
  })
  describe('BURN', () => {
    it('20% at P1, 45% at P6', () => {
      expect(PASSIVES.BURN.compute(1).valuePct).toBe(20)
      expect(PASSIVES.BURN.compute(6).valuePct).toBe(45)
    })
  })
  describe('POISON', () => {
    it('6% at P1, 16% at P6', () => {
      expect(PASSIVES.POISON.compute(1).valuePct).toBe(6)
      expect(PASSIVES.POISON.compute(6).valuePct).toBe(16)
    })
  })
  describe('BLOODLUST', () => {
    it('20% at P1, 45% at P6', () => {
      expect(PASSIVES.BLOODLUST.compute(1).valuePct).toBe(20)
      expect(PASSIVES.BLOODLUST.compute(6).valuePct).toBe(45)
    })
  })

  describe('clamp', () => {
    it('clamps palier below 1 to 1', () => {
      expect(PASSIVES.VAMPIRISM.compute(0).valuePct).toBe(15)
      expect(PASSIVES.VAMPIRISM.compute(-3).valuePct).toBe(15)
    })
    it('clamps palier above 6 to 6', () => {
      expect(PASSIVES.VAMPIRISM.compute(7).valuePct).toBe(40)
      expect(PASSIVES.VAMPIRISM.compute(100).valuePct).toBe(40)
    })
  })

  describe('rarityHint', () => {
    it('EPIC passives are tagged EPIC', () => {
      const epicKeys: PassiveKey[] = [
        'VAMPIRISM',
        'AEGIS',
        'BANNER',
        'RIPOSTE',
        'SANCTUARY',
        'BURN',
        'POISON',
      ]
      for (const k of epicKeys) {
        expect(PASSIVES[k].rarityHint).toBe('EPIC')
      }
    })
    it('LEGENDARY passives are tagged LEGENDARY', () => {
      expect(PASSIVES.REBIRTH.rarityHint).toBe('LEGENDARY')
      expect(PASSIVES.EXECUTION.rarityHint).toBe('LEGENDARY')
      expect(PASSIVES.BLESSING.rarityHint).toBe('LEGENDARY')
      expect(PASSIVES.BLOODLUST.rarityHint).toBe('LEGENDARY')
    })
  })

  describe('describe()', () => {
    it('returns localized French strings with the palier value', () => {
      expect(PASSIVES.VAMPIRISM.describe(1)).toContain('15 %')
      expect(PASSIVES.AEGIS.describe(3)).toContain('11 %')
    })
  })

  describe('getPassive()', () => {
    it('returns the definition for a known key', () => {
      expect(getPassive('VAMPIRISM')).toBe(PASSIVES.VAMPIRISM)
    })
    it('returns null for unknown / null / undefined', () => {
      expect(getPassive('UNKNOWN')).toBeNull()
      expect(getPassive(null)).toBeNull()
      expect(getPassive(undefined)).toBeNull()
    })
  })
})
