import { describe, expect, it } from '@jest/globals'

import { rollTowerDrop } from '../../main/domain/tower/tower-drop'

function prngSequence(valeurs: number[]): () => number {
  let i = 0
  return () => valeurs[i++ % valeurs.length]
}

const POIDS = { UNCOMMON: 5, RARE: 45, EPIC: 46, LEGENDARY: 4 }

describe('tirage de drop en tour', () => {
  it('le slot est dicté par l élément de la tour, jamais tiré', () => {
    for (const [element, slot] of [
      ['FIRE', 'EMBER'], ['WATER', 'PRISM'],
      ['NATURE', 'SAP'], ['EARTH', 'MONOLITH'],
    ] as const) {
      const d = rollTowerDrop({
        element, weights: POIDS, prng: prngSequence([0.5, 0.5]),
      })
      expect(d.slot).toBe(slot)
    }
  })

  it('le set est tiré uniformément parmi les 4', () => {
    const comptes = new Map<string, number>()
    for (let i = 0; i < 4000; i++) {
      const r = (i % 4000) / 4000
      const d = rollTowerDrop({
        element: 'FIRE', weights: POIDS, prng: prngSequence([r, 0.5]),
      })
      comptes.set(d.setKey, (comptes.get(d.setKey) ?? 0) + 1)
    }
    expect(comptes.size).toBe(4)
    for (const [, n] of comptes) {
      expect(n).toBeGreaterThan(800) // ~1000 attendu, tolérance large
    }
  })

  it('respecte les poids de rareté', () => {
    // Premier tirage : set. Second : rareté.
    const legendaire = rollTowerDrop({
      element: 'FIRE', weights: POIDS, prng: prngSequence([0, 0.99]),
    })
    expect(legendaire.rarity).toBe('LEGENDARY')
    const uncommon = rollTowerDrop({
      element: 'FIRE', weights: POIDS, prng: prngSequence([0, 0.01]),
    })
    expect(uncommon.rarity).toBe('UNCOMMON')
  })

  it('ne renvoie jamais null — la pièce est garantie', () => {
    for (let i = 0; i < 200; i++) {
      const d = rollTowerDrop({
        element: 'EARTH', weights: POIDS, prng: prngSequence([i / 200, i / 200]),
      })
      expect(d).not.toBeNull()
      expect(d.rarity).toBeTruthy()
    }
  })
})
