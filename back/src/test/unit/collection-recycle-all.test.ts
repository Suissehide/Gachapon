import { describe, expect, it } from '@jest/globals'
import {
  computeBulkRecycle,
  raritiesUpTo,
} from '../../main/domain/collection/collection.domain'

const RATES = {
  COMMON: 10,
  UNCOMMON: 30,
  RARE: 80,
  EPIC: 240,
  LEGENDARY: 800,
} as const

describe('raritiesUpTo', () => {
  it('COMMON → uniquement COMMON', () => {
    expect(raritiesUpTo('COMMON')).toEqual(['COMMON'])
  })

  it('RARE → seuil cumulatif COMMON..RARE', () => {
    expect(raritiesUpTo('RARE')).toEqual(['COMMON', 'UNCOMMON', 'RARE'])
  })

  it('LEGENDARY → toutes les raretés', () => {
    expect(raritiesUpTo('LEGENDARY')).toEqual([
      'COMMON',
      'UNCOMMON',
      'RARE',
      'EPIC',
      'LEGENDARY',
    ])
  })
})

describe('computeBulkRecycle', () => {
  it('recycle quantity - 1 copies par carte (1 exemplaire conservé)', () => {
    const result = computeBulkRecycle(
      [{ rarity: 'COMMON', quantity: 4 }],
      RATES,
      1,
    )
    expect(result.copiesRecycled).toBe(3)
    expect(result.dustEarned).toBe(30) // 3 × 10
  })

  it('somme plusieurs cartes de raretés différentes', () => {
    const result = computeBulkRecycle(
      [
        { rarity: 'COMMON', quantity: 4 }, // 3 copies × 10 = 30
        { rarity: 'RARE', quantity: 3 }, // 2 copies × 80 = 160
      ],
      RATES,
      1,
    )
    expect(result.copiesRecycled).toBe(5)
    expect(result.dustEarned).toBe(190)
  })

  it('ignore les cartes sans doublon (quantity <= 1)', () => {
    const result = computeBulkRecycle(
      [
        { rarity: 'COMMON', quantity: 1 },
        { rarity: 'EPIC', quantity: 0 },
      ],
      RATES,
      1,
    )
    expect(result.copiesRecycled).toBe(0)
    expect(result.dustEarned).toBe(0)
  })

  it('applique le multiplicateur de skill tree avec arrondi par carte', () => {
    const result = computeBulkRecycle(
      [{ rarity: 'UNCOMMON', quantity: 2 }], // 1 copie × 30 × 1.15 = 34.5 → 35
      RATES,
      1.15,
    )
    expect(result.dustEarned).toBe(35)
  })

  it('liste vide → zéro partout', () => {
    expect(computeBulkRecycle([], RATES, 1)).toEqual({
      dustEarned: 0,
      copiesRecycled: 0,
    })
  })
})
