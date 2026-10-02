import { describe, expect, it } from '@jest/globals'

import { weightedPick } from '../../main/domain/shared/weighted-pick'

function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('weightedPick', () => {
  it('respecte les poids (85 contre 15 → ~85 %)', () => {
    const items = [
      { id: 'a', dropWeight: 85 },
      { id: 'b', dropWeight: 15 },
    ]
    const rng = seeded(42)
    let a = 0
    for (let i = 0; i < 10_000; i++) {
      if (weightedPick(items, rng).id === 'a') {
        a++
      }
    }
    expect(a / 10_000).toBeGreaterThan(0.82)
    expect(a / 10_000).toBeLessThan(0.88)
  })

  it('ne choisit jamais un poids nul', () => {
    const items = [
      { id: 'a', dropWeight: 0 },
      { id: 'b', dropWeight: 1 },
    ]
    const rng = seeded(7)
    for (let i = 0; i < 1_000; i++) {
      expect(weightedPick(items, rng).id).toBe('b')
    }
  })
})
