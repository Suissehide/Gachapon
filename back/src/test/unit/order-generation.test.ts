import { describe, expect, it } from '@jest/globals'

import { suggestPicks } from '../../main/domain/orders/order-matching'
import {
  generateOrderLines,
  pickClient,
} from '../../main/domain/orders/order-generation'
import type {
  DuplicateStack,
  PoolCard,
} from '../../main/types/domain/orders/orders.domain.interface'
import { RARITY_ORDER } from '../../main/domain/wagers/wager-rules'

/** RNG déterministe (mulberry32) : un seed = une séquence reproductible. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pool: PoolCard[] = (
  ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
).flatMap((rarity, r) =>
  (['FIRE', 'WATER'] as const).map((element, e) => ({
    id: `${rarity}-${element}`,
    rarity,
    element,
    setId: e === 0 ? 's1' : 's2',
    dropWeight: [85, 38, 16, 8, 2][r]!,
  })),
)

const dups: DuplicateStack[] = [
  { userCardId: 'u1', cardId: 'RARE-WATER', rarity: 'RARE', element: 'WATER', setId: 's2', available: 2 },
  { userCardId: 'u2', cardId: 'COMMON-FIRE', rarity: 'COMMON', element: 'FIRE', setId: 's1', available: 3 },
]

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1)

describe('generateOrderLines', () => {
  it('rend 1 à 2 lignes de 1 à 3 cartes', () => {
    for (const s of SEEDS) {
      for (const feasible of [true, false]) {
        const lines = generateOrderLines({ duplicates: dups, pool, maxOwnedRarity: 'LEGENDARY', feasible, rng: seeded(s) })
        expect(lines.length).toBeGreaterThanOrEqual(1)
        expect(lines.length).toBeLessThanOrEqual(2)
        for (const l of lines) {
          expect(l.quantity).toBeGreaterThanOrEqual(1)
          expect(l.quantity).toBeLessThanOrEqual(3)
          expect(l.element && l.setId).toBeFalsy()
        }
      }
    }
  })

  it('une commande faisable est livrable avec les doublons fournis', () => {
    for (const s of SEEDS) {
      const lines = generateOrderLines({ duplicates: dups, pool, maxOwnedRarity: 'RARE', feasible: true, rng: seeded(s) })
      expect(suggestPicks(lines, dups)).not.toBeNull()
    }
  })

  it('plafonne la rareté d’une commande libre à la rareté max possédée', () => {
    for (const s of SEEDS) {
      const lines = generateOrderLines({ duplicates: [], pool, maxOwnedRarity: 'UNCOMMON', feasible: false, rng: seeded(s) })
      for (const l of lines) {
        expect(RARITY_ORDER.indexOf(l.rarity)).toBeLessThanOrEqual(RARITY_ORDER.indexOf('UNCOMMON'))
      }
    }
  })

  // Review Focus 3 : joueur sans doublon → repli sur une commande libre.
  it('se replie sur une commande libre faute de doublons', () => {
    const lines = generateOrderLines({ duplicates: [], pool, maxOwnedRarity: 'COMMON', feasible: true, rng: seeded(7) })
    expect(lines.length).toBeGreaterThanOrEqual(1)
    expect(lines.every((l) => l.rarity === 'COMMON')).toBe(true)
  })

  it('ne produit jamais deux lignes aux critères identiques', () => {
    for (const s of SEEDS) {
      const lines = generateOrderLines({ duplicates: dups, pool, maxOwnedRarity: 'LEGENDARY', feasible: false, rng: seeded(s) })
      if (lines.length === 2) {
        const [a, b] = lines
        expect(a!.rarity === b!.rarity && a!.element === b!.element && a!.setId === b!.setId).toBe(false)
      }
    }
  })
})

describe('pickClient', () => {
  it('rend une carte du pool', () => {
    expect(pool.map((c) => c.id)).toContain(pickClient(pool, seeded(3)))
  })
})
