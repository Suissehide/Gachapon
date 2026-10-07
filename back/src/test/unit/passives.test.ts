import { describe, expect, it } from '@jest/globals'

import {
  getPassive,
  PASSIVES,
  type PassiveKey,
} from '../../main/domain/combat/passives'
import { runWithLocale } from '../../main/infra/i18n/locale-context'

describe('passives', () => {
  describe('famille provocation / ciblage', () => {
    it('TAUNT : 25% at P1, 50% at P6 (chance d attirer un coup)', () => {
      expect(PASSIVES.TAUNT.compute(1).valuePct).toBe(25)
      expect(PASSIVES.TAUNT.compute(6).valuePct).toBe(50)
    })
    it('GUARDIAN : 31% at P1, 61% at P6 (part détournée)', () => {
      expect(PASSIVES.GUARDIAN.compute(1).valuePct).toBe(31)
      expect(PASSIVES.GUARDIAN.compute(6).valuePct).toBe(61)
    })
    it('HUNT : 35% at P1, 70% at P6 (chance de viser la marque)', () => {
      expect(PASSIVES.HUNT.compute(1).valuePct).toBe(35)
      expect(PASSIVES.HUNT.compute(6).valuePct).toBe(70)
    })
  })
  describe('famille contrôle / affaiblissement', () => {
    it('STUN : 30% at P1, 65% at P6 (chance d étourdir)', () => {
      expect(PASSIVES.STUN.compute(1).valuePct).toBe(30)
      expect(PASSIVES.STUN.compute(6).valuePct).toBe(65)
    })
    it('WEAKEN : 12% at P1, 22% at P6 (ATQ retirée)', () => {
      expect(PASSIVES.WEAKEN.compute(1).valuePct).toBe(12)
      expect(PASSIVES.WEAKEN.compute(6).valuePct).toBe(22)
    })
    it('SUNDER : 39% at P1, 84% at P6 (DEF retirée)', () => {
      expect(PASSIVES.SUNDER.compute(1).valuePct).toBe(39)
      expect(PASSIVES.SUNDER.compute(6).valuePct).toBe(84)
    })
  })
  describe('CRIT', () => {
    // Tâche 9 : la magnitude (chance de critique) est cédée à critRate/critDmg.
    // Le passif ne porte plus que la cadence, fixe, indépendante du palier.
    it('cadence fixe de 2 actions, quel que soit le palier', () => {
      expect(PASSIVES.CRIT.compute(1).valuePct).toBe(2)
      expect(PASSIVES.CRIT.compute(6).valuePct).toBe(2)
    })
  })
  describe('HAMPER', () => {
    it('33% at P1, 73% at P6 (part du seuil d action retirée)', () => {
      expect(PASSIVES.HAMPER.compute(1).valuePct).toBe(33)
      expect(PASSIVES.HAMPER.compute(6).valuePct).toBe(73)
    })
  })
  describe('AEGIS', () => {
    it('11% at P1, 26% at P6', () => {
      expect(PASSIVES.AEGIS.compute(1).valuePct).toBe(11)
      expect(PASSIVES.AEGIS.compute(6).valuePct).toBe(26)
    })
  })
  describe('BANNER', () => {
    it('4% at P1, 14% at P6', () => {
      expect(PASSIVES.BANNER.compute(1).valuePct).toBe(4)
      expect(PASSIVES.BANNER.compute(6).valuePct).toBe(14)
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
    it('75% at P1, 150% at P6 (bonus à 0 PV, au prorata des PV manquants)', () => {
      expect(PASSIVES.EXECUTION.compute(1).valuePct).toBe(75)
      expect(PASSIVES.EXECUTION.compute(6).valuePct).toBe(150)
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
    it('cadence fixe de 2 actions, quel que soit le palier', () => {
      expect(PASSIVES.HASTE.compute(1).valuePct).toBe(3)
      expect(PASSIVES.HASTE.compute(6).valuePct).toBe(3)
    })
  })
  describe('FORTIFY', () => {
    it('15% at P1, 40% at P6 (DEF gagnée par charge)', () => {
      expect(PASSIVES.FORTIFY.compute(1).valuePct).toBe(15)
      expect(PASSIVES.FORTIFY.compute(6).valuePct).toBe(40)
    })
  })
  describe('EMPOWER', () => {
    it('4% at P1, 9% at P6 (ATQ gagnée par charge)', () => {
      expect(PASSIVES.EMPOWER.compute(1).valuePct).toBe(4)
      expect(PASSIVES.EMPOWER.compute(6).valuePct).toBe(9)
    })
  })

  describe('BLESSING', () => {
    it('2% at P1, 4.5% at P6', () => {
      expect(PASSIVES.BLESSING.compute(1).valuePct).toBe(2)
      expect(PASSIVES.BLESSING.compute(6).valuePct).toBe(4.5)
    })
  })
  describe('SANCTUARY', () => {
    it('0.5% at P1, 1.5% at P6', () => {
      expect(PASSIVES.SANCTUARY.compute(1).valuePct).toBe(0.5)
      expect(PASSIVES.SANCTUARY.compute(6).valuePct).toBe(1.5)
    })
  })
  describe('BURN', () => {
    it('0.5% at P1, 2% at P6', () => {
      expect(PASSIVES.BURN.compute(1).valuePct).toBe(6)
      expect(PASSIVES.BURN.compute(6).valuePct).toBe(16)
    })
  })
  describe('POISON', () => {
    it('6% at P1, 16% at P6', () => {
      expect(PASSIVES.POISON.compute(1).valuePct).toBe(0.5)
      expect(PASSIVES.POISON.compute(6).valuePct).toBe(2)
    })
  })
  describe('MOMENTUM', () => {
    it('27% at P1, 62% at P6 (part du seuil d action donnée)', () => {
      expect(PASSIVES.MOMENTUM.compute(1).valuePct).toBe(27)
      expect(PASSIVES.MOMENTUM.compute(6).valuePct).toBe(62)
    })
  })

  describe('clamp', () => {
    // AEGIS sert de témoin pour clampPalier().
    it('clamps palier below 1 to 1', () => {
      expect(PASSIVES.AEGIS.compute(0).valuePct).toBe(11)
      expect(PASSIVES.AEGIS.compute(-3).valuePct).toBe(11)
    })
    it('clamps palier above 6 to 6', () => {
      expect(PASSIVES.AEGIS.compute(7).valuePct).toBe(26)
      expect(PASSIVES.AEGIS.compute(100).valuePct).toBe(26)
    })
  })

  describe('rarityHint', () => {
    it('EPIC passives are tagged EPIC', () => {
      const epicKeys: PassiveKey[] = [
        'TAUNT',
        'GUARDIAN',
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
      expect(PASSIVES.MOMENTUM.rarityHint).toBe('LEGENDARY')
      expect(PASSIVES.HUNT.rarityHint).toBe('LEGENDARY')
    })
  })

  describe('describe()', () => {
    it('returns localized French strings with the palier value', () => {
      runWithLocale('FR', () => {
        expect(PASSIVES.AEGIS.describe(3)).toContain('17 %')
      })
    })
    // Tâche 9 : CRIT n'a plus de magnitude palier-dépendante — son
    // describe() est un texte fixe.
    it('CRIT décrit un comportement fixe, sans pourcentage de palier', () => {
      runWithLocale('FR', () => {
        expect(PASSIVES.CRIT.describe(1)).toBe(
          'Toutes les 2 attaques, inflige un coup critique garanti',
        )
      })
    })
    it('BULWARK parle des PV max du porteur', () => {
      runWithLocale('FR', () => {
        expect(PASSIVES.BULWARK.describe(6)).toBe(
          'Commence le combat avec un bouclier de 61 % de ses PV max',
        )
      })
    })
  })

  // Tâche 4 du lot i18n — libellé et description sont désormais résolus
  // dans la locale de la requête courante (voir `passives.definitions.ts`).
  describe('label et describe() par locale', () => {
    it('EN par défaut, hors de tout contexte de requête', () => {
      expect(PASSIVES.AEGIS.label).toBe('Aegis')
      expect(PASSIVES.AEGIS.describe(3)).toContain('17%')
    })
    it('FR sous runWithLocale', () => {
      runWithLocale('FR', () => {
        expect(PASSIVES.AEGIS.label).toBe('Égide')
      })
    })
    it('EN explicite sous runWithLocale', () => {
      runWithLocale('EN', () => {
        expect(PASSIVES.CRIT.describe(1)).toBe(
          'Every 2 attacks, deals a guaranteed critical hit',
        )
      })
    })
  })

  describe('getPassive()', () => {
    it('returns the definition for a known key', () => {
      expect(getPassive('TAUNT')).toBe(PASSIVES.TAUNT)
    })
    it('returns null for unknown / null / undefined', () => {
      expect(getPassive('UNKNOWN')).toBeNull()
      expect(getPassive(null)).toBeNull()
      expect(getPassive(undefined)).toBeNull()
    })
  })
})
