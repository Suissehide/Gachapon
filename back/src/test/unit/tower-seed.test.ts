import { describe, expect, it } from '@jest/globals'

import { RARITY_BASE } from '../../../prisma/seed/campaign'
import {
  TOWER_ELEMENTS,
  buildTowerFloors,
  towerEnemyPower,
  towerFloorLoot,
} from '../../../prisma/seed/tower'
import { EquipmentSlot } from '../../generated/client'
import {
  CAMPAIGN_EQUIPMENT_SLOTS,
  TOWER_EQUIPMENT_SLOTS,
  TOWER_SLOT_BY_ELEMENT,
} from '../../main/domain/tower/tower-slots'

describe('seed des tours', () => {
  const etages = buildTowerFloors()

  it('produit 40 étages (4 tours x 10)', () => {
    expect(etages).toHaveLength(40)
  })

  it('ne couvre que les 4 éléments du cycle, jamais LIGHT ni DARK', () => {
    expect([...TOWER_ELEMENTS].sort()).toEqual(['EARTH', 'FIRE', 'NATURE', 'WATER'])
    for (const e of etages) {
      expect(TOWER_ELEMENTS).toContain(e.element)
    }
  })

  it('associe chaque tour à un slot distinct', () => {
    const slots = Object.values(TOWER_SLOT_BY_ELEMENT)
    expect(new Set(slots).size).toBe(4)
    expect(slots).not.toContain('WEAPON')
    expect(slots).not.toContain('ARMOR')
    expect(slots).not.toContain('ACCESSORY')
  })

  it('les poids de rareté somment à 100 à chaque étage', () => {
    for (let f = 1; f <= 10; f++) {
      const total = Object.values(towerFloorLoot(f).farm.equipmentWeights).reduce(
        (a, b) => a + (b as number),
        0,
      )
      expect(total).toBeCloseTo(100, 6)
    }
  })

  it('droppe une pièce garantie à chaque étage', () => {
    for (let f = 1; f <= 10; f++) {
      expect(towerFloorLoot(f).farm.equipmentDropChance).toBe(1)
    }
  })

  it('la part d EPIC+ croît strictement avec l étage', () => {
    const partEpicPlus = (f: number) => {
      const w = towerFloorLoot(f).farm.equipmentWeights as Record<string, number>
      return (w.EPIC ?? 0) + (w.LEGENDARY ?? 0)
    }
    for (let f = 2; f <= 10; f++) {
      expect(partEpicPlus(f)).toBeGreaterThanOrEqual(partEpicPlus(f - 1))
    }
    expect(partEpicPlus(10)).toBeGreaterThan(partEpicPlus(1))
  })

  it('la difficulté monte par marches franches, pas linéairement', () => {
    const puissance = (f: number) => towerEnemyPower(f).baseAtk
    const marches = Array.from({ length: 9 }, (_, i) => puissance(i + 2) / puissance(i + 1))
    // Au moins une marche vaut le double d'une autre : la courbe n'est pas plate.
    expect(Math.max(...marches) / Math.min(...marches)).toBeGreaterThan(1.5)
  })

  it('le profil de base des ennemis de tour suit RARITY_BASE.EPIC de la campagne, pas un littéral recopié', () => {
    // Étage 1 (échelle ×1) : baseHp/baseAtk/baseDef doivent être EXACTEMENT
    // le profil EPIC de la campagne, sinon la puissance des tours dérive en
    // silence d'un futur rééquilibrage de campagne (voir campaign.ts).
    const p1 = towerEnemyPower(1)
    expect(p1.baseHp).toBe(RARITY_BASE.EPIC.hp)
    expect(p1.baseAtk).toBe(RARITY_BASE.EPIC.atk)
    expect(p1.baseDef).toBe(RARITY_BASE.EPIC.def)
    expect(p1.baseSpd).toBe(RARITY_BASE.EPIC.spd)
  })

  it('chaque ennemi porte son mitigationScale', () => {
    for (const e of etages) {
      for (const ennemi of e.enemyTeam) {
        expect(typeof ennemi.mitigationScale).toBe('number')
        expect(ennemi.mitigationScale).toBeGreaterThan(0)
      }
    }
  })
})

describe('CAMPAIGN_EQUIPMENT_SLOTS — pool de drop campagne (G1)', () => {
  it('aucun slot de tour ne peut sortir d\'un drop de campagne', () => {
    for (const slot of TOWER_EQUIPMENT_SLOTS) {
      expect(CAMPAIGN_EQUIPMENT_SLOTS).not.toContain(slot)
    }
  })

  it('tour + campagne recouvrent exactement tout l\'enum EquipmentSlot, sans trou ni doublon', () => {
    const combined = [...TOWER_EQUIPMENT_SLOTS, ...CAMPAIGN_EQUIPMENT_SLOTS].sort()
    expect(combined).toEqual([...Object.values(EquipmentSlot)].sort())
    // Pas de doublon : les deux ensembles partitionnent l'enum.
    expect(new Set(combined).size).toBe(combined.length)
  })

  it('les 3 slots classiques (WEAPON/ARMOR/ACCESSORY) sont les seuls slots de campagne actuels', () => {
    expect([...CAMPAIGN_EQUIPMENT_SLOTS].sort()).toEqual(
      ['ACCESSORY', 'ARMOR', 'WEAPON'].sort(),
    )
  })
})
