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
    expect(slots).not.toContain('RING')
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

  it('la difficulté monte vite en bas et par paliers fins en haut', () => {
    // Troisième forme demandée pour cette courbe, après « marches franches »
    // puis « linéaire » : montée RAPIDE au début, qui filtre, puis paliers de
    // plus en plus FINS, pour qu'un niveau de carte ou une pièce suffise à
    // franchir la marche suivante.
    const puissance = (f: number) => towerEnemyPower(f).baseAtk
    const rapports = Array.from(
      { length: 9 },
      (_, i) => puissance(i + 2) / puissance(i + 1),
    )
    // Strictement croissante, et les rapports DÉCROISSENT : chaque marche est
    // relativement plus douce que la précédente.
    for (let i = 0; i < rapports.length; i++) {
      expect(rapports[i]).toBeGreaterThan(1)
      if (i > 0) {
        expect(rapports[i]).toBeLessThanOrEqual(rapports[i - 1])
      }
    }
    // Le bas filtre (premier rapport large), le haut se joue à peu de chose.
    expect(rapports[0]).toBeGreaterThan(2)
    expect(rapports[rapports.length - 1]).toBeLessThan(1.15)
  })

  it('chaque étage a ses propres taux de rareté', () => {
    // Monter est récompensé par le BUTIN et non par la difficulté : deux
    // étages voisins ne doivent jamais partager la même table de raretés,
    // sinon l'étage supérieur n'apporte rien.
    const table = (f: number) =>
      JSON.stringify(towerFloorLoot(f).farm.equipmentWeights)
    for (let f = 2; f <= 10; f++) {
      expect(table(f)).not.toBe(table(f - 1))
    }
  })

  it('le profil de base des ennemis de tour suit RARITY_BASE.EPIC de la campagne, pas un littéral recopié', () => {
    // Le profil de base reste EXACTEMENT celui d'EPIC en campagne, mis à
    // l'échelle de l'étage — sinon la puissance des tours dérive en silence
    // d'un futur rééquilibrage de campagne (voir campaign.ts). L'étage 1
    // n'étant plus à l'échelle ×1, on vérifie le RAPPORT plutôt que l'égalité.
    const p1 = towerEnemyPower(1)
    const echelle = p1.baseHp / RARITY_BASE.EPIC.hp
    expect(echelle).toBeGreaterThan(0)
    expect(p1.baseAtk).toBe(Math.round(RARITY_BASE.EPIC.atk * echelle))
    expect(p1.baseDef).toBe(Math.round(RARITY_BASE.EPIC.def * echelle))
    // La vitesse ne suit pas l'échelle de l'étage, seulement son index.
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

  it('les 3 slots classiques (WEAPON/ARMOR/RING) sont les seuls slots de campagne actuels', () => {
    expect([...CAMPAIGN_EQUIPMENT_SLOTS].sort()).toEqual(
      ['RING', 'ARMOR', 'WEAPON'].sort(),
    )
  })
})
