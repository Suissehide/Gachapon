import { describe, expect, it } from '@jest/globals'

import { buildEquipmentCatalog } from '../../../prisma/seed/equipment'

describe('catalogue d équipement', () => {
  const catalogue = buildEquipmentCatalog()

  it('produit 140 pièces (4 sets x 7 slots x 5 raretés)', () => {
    expect(catalogue).toHaveLength(140)
  })

  it('couvre chaque combinaison exactement une fois', () => {
    const cles = catalogue.map((e) => `${e.setKey}|${e.slot}|${e.rarity}`)
    expect(new Set(cles).size).toBe(140)
  })

  it('donne à chaque pièce exactement une stat principale, dictée par son slot', () => {
    for (const piece of catalogue) {
      expect(Object.keys(piece.bonuses)).toHaveLength(1)
    }
    const parSlot = new Map<string, Set<string>>()
    for (const p of catalogue) {
      const set = parSlot.get(p.slot) ?? new Set()
      set.add(Object.keys(p.bonuses)[0])
      parSlot.set(p.slot, set)
    }
    for (const [, stats] of parSlot) {
      expect(stats.size).toBe(1)
    }
  })

  it('la magnitude croît strictement avec la rareté, à slot et set égaux', () => {
    const ordre = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
    const serie = ordre.map((r) => {
      const p = catalogue.find(
        (e) => e.rarity === r && e.slot === 'WEAPON' && e.setKey === 'FUREUR',
      )
      if (!p) throw new Error(`pièce manquante pour ${r}`)
      return Object.values(p.bonuses)[0] as number
    })
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i]).toBeGreaterThan(serie[i - 1])
    }
  })

  it('le dropWeight décroît strictement avec la rareté', () => {
    const poids = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(
      (r) => catalogue.find((e) => e.rarity === r)!.dropWeight,
    )
    for (let i = 1; i < poids.length; i++) {
      expect(poids[i]).toBeLessThan(poids[i - 1])
    }
  })
})
