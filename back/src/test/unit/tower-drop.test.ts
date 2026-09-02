import { describe, expect, it } from '@jest/globals'

import {
  rollTowerDrop,
  rollTowerFirstClearDrop,
} from '../../main/domain/tower/tower-drop'

function prngSequence(valeurs: number[]): () => number {
  let i = 0
  return () => valeurs[i++ % valeurs.length]
}

const POIDS = { UNCOMMON: 5, RARE: 45, EPIC: 46, LEGENDARY: 4 }

describe('tirage de drop en tour', () => {
  it('le slot est dicté par l élément de la tour, jamais tiré', () => {
    for (const [element, slot] of [
      ['FIRE', 'GLOVES'], ['WATER', 'BOOTS'],
      ['NATURE', 'AMULET'], ['EARTH', 'BELT'],
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


describe('tirage de drop en tour — premier passage vs farm', () => {
  // Poids réels de l'étage 1-2 (prisma/seed/tower.ts:RARITY_WEIGHTS) : le
  // farm peut rendre du COMMON. Le premier passage ne le doit JAMAIS, il a
  // un plancher UNCOMMON (guaranteedEquipment.minRarity) — c'est le bug
  // corrigé en relecture : le domaine appliquait à tort la table du farm
  // au premier passage, donc le plancher ne se déclenchait jamais.
  const POIDS_ETAGE_1 = { COMMON: 70, UNCOMMON: 30 }

  it("le premier passage respecte le plancher de rareté, contrairement au farm sur le même étage (preuve par mutation : sans plancher, ce test échoue)", () => {
    // Même graine PRNG pour les deux chemins : seule la SOURCE de rareté
    // change (farm.equipmentWeights vs guaranteedEquipment.minRarity), pas
    // le tirage du set — donc si un lecteur futur fait pointer
    // rollTowerFirstClearDrop sur rollTowerDrop(weights) par erreur (ou
    // supprime le plancher), ce test doit échouer.
    const farm = rollTowerDrop({
      element: 'FIRE',
      weights: POIDS_ETAGE_1,
      prng: prngSequence([0, 0]),
    })
    expect(farm.rarity).toBe('COMMON')

    const premierPassage = rollTowerFirstClearDrop({
      element: 'FIRE',
      firstClear: {
        gold: 0,
        dust: 0,
        xp: 0,
        guaranteedEquipment: { minRarity: 'UNCOMMON' },
      },
      prng: prngSequence([0, 0]),
    })
    expect(premierPassage.rarity).not.toBe('COMMON')
    expect(premierPassage.rarity).toBe('UNCOMMON')
  })

  it('le plancher du premier passage suit le seed (RARE à partir de l’étage 7)', () => {
    const premierPassage = rollTowerFirstClearDrop({
      element: 'WATER',
      firstClear: {
        gold: 0,
        dust: 0,
        xp: 0,
        guaranteedEquipment: { minRarity: 'RARE' },
      },
      prng: prngSequence([0, 0]),
    })
    expect(premierPassage.rarity).not.toBe('COMMON')
    expect(premierPassage.rarity).not.toBe('UNCOMMON')
    expect(premierPassage.rarity).toBe('RARE')
  })

  it('le slot du premier passage reste dicté par la tour, jamais tiré', () => {
    const d = rollTowerFirstClearDrop({
      element: 'EARTH',
      firstClear: {
        gold: 0,
        dust: 0,
        xp: 0,
        guaranteedEquipment: { minRarity: 'UNCOMMON' },
      },
      prng: prngSequence([0.5, 0.5]),
    })
    expect(d.slot).toBe('BELT')
  })

  it('ne renvoie jamais null — le premier passage aussi est garanti', () => {
    for (let i = 0; i < 200; i++) {
      const d = rollTowerFirstClearDrop({
        element: 'NATURE',
        firstClear: {
          gold: 0,
          dust: 0,
          xp: 0,
          guaranteedEquipment: { minRarity: 'UNCOMMON' },
        },
        prng: prngSequence([i / 200, i / 200]),
      })
      expect(d).not.toBeNull()
      expect(d.rarity).toBeTruthy()
    }
  })
})
