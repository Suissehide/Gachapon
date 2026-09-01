import { describe, expect, it } from '@jest/globals'

import {
  getPassive,
  PASSIVES,
  type PassiveKey,
} from '../../main/domain/combat/passives'

describe('passives', () => {
  describe('VAMPIRISM', () => {
    // Tâche 9 : la magnitude (soin en % des dégâts) est cédée au lifesteal de
    // stuff. Le passif ne porte plus qu'un facteur de doublement fixe,
    // indépendant du palier.
    it('facteur de doublement fixe, quel que soit le palier', () => {
      expect(PASSIVES.VAMPIRISM.compute(1).valuePct).toBe(100)
      expect(PASSIVES.VAMPIRISM.compute(6).valuePct).toBe(100)
    })
  })
  describe('CRIT', () => {
    // Tâche 9 : la magnitude (chance de critique) est cédée à critRate/critDmg.
    // Le passif ne porte plus que la cadence, fixe, indépendante du palier.
    it('cadence fixe de 3 actions, quel que soit le palier', () => {
      expect(PASSIVES.CRIT.compute(1).valuePct).toBe(3)
      expect(PASSIVES.CRIT.compute(6).valuePct).toBe(3)
    })
  })
  describe('PIERCE', () => {
    // Tâche 9 : la magnitude (% de DEF ignorée) est cédée à armorPen.
    // Le passif ignore 100 % de la DEF, mais seulement au premier coup.
    it("part de DEF ignorée fixe à 100 %, quel que soit le palier", () => {
      expect(PASSIVES.PIERCE.compute(1).valuePct).toBe(100)
      expect(PASSIVES.PIERCE.compute(6).valuePct).toBe(100)
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

  // Tâche 10 : VIGOR, HASTE, FORTIFY et EMPOWER dupliquaient un bonus
  // d'équipement (+X % PV/VIT/DEF/ATQ figé). Ils deviennent dynamiques ;
  // seul HASTE garde une magnitude fixe (cadence, indépendante du palier).
  describe('VIGOR', () => {
    it('24% at P1, 44% at P6 (part des PV max rendue)', () => {
      expect(PASSIVES.VIGOR.compute(1).valuePct).toBe(24)
      expect(PASSIVES.VIGOR.compute(6).valuePct).toBe(44)
    })
  })
  describe('HASTE', () => {
    it('cadence fixe de 3 actions, quel que soit le palier', () => {
      expect(PASSIVES.HASTE.compute(1).valuePct).toBe(3)
      expect(PASSIVES.HASTE.compute(6).valuePct).toBe(3)
    })
  })
  describe('FORTIFY', () => {
    it('6% at P1, 16% at P6 (DEF gagnée par charge)', () => {
      expect(PASSIVES.FORTIFY.compute(1).valuePct).toBe(6)
      expect(PASSIVES.FORTIFY.compute(6).valuePct).toBe(16)
    })
  })
  describe('EMPOWER', () => {
    it('4% at P1, 9% at P6 (ATQ gagnée par charge)', () => {
      expect(PASSIVES.EMPOWER.compute(1).valuePct).toBe(4)
      expect(PASSIVES.EMPOWER.compute(6).valuePct).toBe(9)
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
    // VAMPIRISM ne dépend plus du palier depuis la tâche 9 (facteur fixe) ;
    // AEGIS reste palier-dépendant et sert de témoin pour clampPalier().
    it('clamps palier below 1 to 1', () => {
      expect(PASSIVES.AEGIS.compute(0).valuePct).toBe(7)
      expect(PASSIVES.AEGIS.compute(-3).valuePct).toBe(7)
    })
    it('clamps palier above 6 to 6', () => {
      expect(PASSIVES.AEGIS.compute(7).valuePct).toBe(17)
      expect(PASSIVES.AEGIS.compute(100).valuePct).toBe(17)
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
      expect(PASSIVES.AEGIS.describe(3)).toContain('11 %')
    })
    // Tâche 9 : CRIT, PIERCE et VAMPIRISM n'ont plus de magnitude
    // palier-dépendante — leur describe() est un texte fixe.
    it('CRIT, PIERCE et VAMPIRISM décrivent un comportement fixe, sans pourcentage de palier', () => {
      expect(PASSIVES.CRIT.describe(1)).toBe(
        'Toutes les 3 attaques, inflige un coup critique garanti',
      )
      expect(PASSIVES.PIERCE.describe(1)).toBe(
        'Le premier coup porté à chaque cible ignore toute sa défense',
      )
      expect(PASSIVES.VAMPIRISM.describe(1)).toBe(
        'Sous 50 % de ses PV, son vol de vie est doublé',
      )
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
