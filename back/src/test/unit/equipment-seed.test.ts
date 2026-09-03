import { describe, expect, it } from '@jest/globals'

import { buildEquipmentCatalog } from '../../../prisma/seed/equipment'

describe('catalogue d équipement', () => {
  const catalogue = buildEquipmentCatalog()

  // 7 sets x 5 raretés x (2 + 4 + 2 + 3 + 3 + 2 + 3) stats principales
  it('produit 665 pièces', () => {
    expect(catalogue).toHaveLength(665)
  })

  it('couvre chaque combinaison exactement une fois', () => {
    const cles = catalogue.map(
      (e) => `${e.setKey}|${e.slot}|${e.rarity}|${e.mainStat}`,
    )
    expect(new Set(cles).size).toBe(665)
  })

  it('donne à chaque pièce exactement une stat principale, et mainStat la nomme', () => {
    for (const piece of catalogue) {
      expect(Object.keys(piece.bonuses)).toEqual([piece.mainStat])
    }
  })

  // La colonne mainStat porte l'unicité en base : deux variantes d'un même
  // emplacement doivent différer par elle, sinon l'upsert du seed écrase.
  it('propose plusieurs stats principales par emplacement, dont des pourcentages', () => {
    const parSlot = new Map<string, Set<string>>()
    for (const p of catalogue) {
      const set = parSlot.get(p.slot) ?? new Set()
      set.add(p.mainStat)
      parSlot.set(p.slot, set)
    }
    expect(parSlot.size).toBe(7)
    for (const [, stats] of parSlot) {
      expect(stats.size).toBeGreaterThan(1)
      expect([...stats].some((k) => k.endsWith('Pct'))).toBe(true)
    }
    // Le manque signalé : %ATQ / %PV / %DÉF n'existaient qu'en sous-stat.
    const toutes = new Set(catalogue.map((e) => e.mainStat))
    for (const k of ['atkPct', 'hpPct', 'defPct']) {
      expect(toutes.has(k as never)).toBe(true)
    }
    // La vitesse ne se donne qu'en plat : en pourcentage elle multiplierait le
    // rendement sous ATB. Elle reste une sous-stat.
    expect(toutes.has('spdPct' as never)).toBe(false)
  })

  // Sans division par la taille du pool, un emplacement à 4 variantes
  // sortirait deux fois plus souvent qu'un emplacement à 2 : les deux tirages
  // (campagne et tour) somment les dropWeight.
  it('garde un poids de drop identique par emplacement, set et rareté', () => {
    const parTriplet = new Map<string, number>()
    for (const p of catalogue) {
      const cle = `${p.setKey}|${p.slot}|${p.rarity}`
      parTriplet.set(cle, (parTriplet.get(cle) ?? 0) + p.dropWeight)
    }
    const parRarete = new Map<string, Set<number>>()
    for (const [cle, poids] of parTriplet) {
      const rarete = cle.split('|')[2]
      const set = parRarete.get(rarete) ?? new Set()
      set.add(Math.round(poids * 1e6) / 1e6)
      parRarete.set(rarete, set)
    }
    for (const [, poids] of parRarete) {
      expect(poids.size).toBe(1)
    }
  })

  it('la magnitude croît strictement avec la rareté, pour chacun des dix barèmes', () => {
    const ordre = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
    // Un barème par stat principale, saisis indépendamment — itérer sur
    // toutes les stats plutôt que sur un échantillon garantit qu'une faute de
    // frappe sur l'un d'eux est détectée. Ce fichier échappe au
    // type-checking, ce test est son seul garde-fou.
    const stats = [...new Set(catalogue.map((e) => e.mainStat))]
    expect(stats).toHaveLength(10)
    for (const stat of stats) {
      const serie = ordre.map((r) => {
        const p = catalogue.find((e) => e.rarity === r && e.mainStat === stat)
        if (!p) throw new Error(`pièce manquante pour ${stat}/${r}`)
        return Object.values(p.bonuses)[0] as number
      })
      for (let i = 1; i < serie.length; i++) {
        expect(serie[i]).toBeGreaterThan(serie[i - 1])
      }
    }
  })

  it('le dropWeight décroît strictement avec la rareté, à emplacement égal', () => {
    const poids = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(
      (r) =>
        catalogue.find((e) => e.rarity === r && e.slot === 'WEAPON')!
          .dropWeight,
    )
    for (let i = 1; i < poids.length; i++) {
      expect(poids[i]).toBeLessThan(poids[i - 1])
    }
  })
})
