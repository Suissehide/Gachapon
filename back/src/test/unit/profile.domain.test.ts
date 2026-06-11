import { describe, expect, it } from '@jest/globals'

import { pickTopByRarity, resolveFeaturedCards } from '../../main/domain/profile/profile.domain'

type Card = { id: string; name: string; rarity: string; setId: string; setName: string; imageUrl: string | null; variant: string }
const card = (over: Partial<Card>): Card => ({
  id: 'c1', name: 'C', rarity: 'COMMON', setId: 's1', setName: 'S', imageUrl: null, variant: 'NORMAL', ...over,
})

describe('pickTopByRarity', () => {
  it('returns one card per rarity from LEGENDARY to COMMON', () => {
    const owned = [
      card({ id: 'a', rarity: 'COMMON' }),
      card({ id: 'b', rarity: 'UNCOMMON' }),
      card({ id: 'c', rarity: 'RARE' }),
      card({ id: 'd', rarity: 'EPIC' }),
      card({ id: 'e', rarity: 'LEGENDARY' }),
    ]
    const result = pickTopByRarity(owned)
    expect(result.map((c) => c.id)).toEqual(['e', 'd', 'c', 'b', 'a'])
  })

  it('returns [] when no cards owned', () => {
    expect(pickTopByRarity([])).toEqual([])
  })

  it('caps at 5 cards', () => {
    const owned = Array.from({ length: 8 }, (_, i) => card({ id: `x${i}`, rarity: 'COMMON' }))
    expect(pickTopByRarity(owned)).toHaveLength(5)
  })

  it('completes with next-most-rare when a tier is missing', () => {
    // No EPIC. We have 1 LEGENDARY, 0 EPIC, 2 RARE, 1 UNCOMMON, 3 COMMON.
    const owned = [
      card({ id: 'leg', rarity: 'LEGENDARY' }),
      card({ id: 'r1', rarity: 'RARE' }),
      card({ id: 'r2', rarity: 'RARE' }),
      card({ id: 'un', rarity: 'UNCOMMON' }),
      card({ id: 'co1', rarity: 'COMMON' }),
      card({ id: 'co2', rarity: 'COMMON' }),
      card({ id: 'co3', rarity: 'COMMON' }),
    ]
    const result = pickTopByRarity(owned)
    // Expect 5 cards, one per rarity slot, missing slots filled with extras (highest first).
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
    // Slot 2 (EPIC missing) → fall to RARE
    expect(['r1', 'r2']).toContain(result[1]!.id)
    expect(['r1', 'r2']).toContain(result[2]!.id)
    expect(result[3]!.id).toBe('un')
    // Last slot fills with one COMMON
    expect(['co1', 'co2', 'co3']).toContain(result[4]!.id)
  })
})

describe('resolveFeaturedCards', () => {
  const owned = [
    card({ id: 'leg', rarity: 'LEGENDARY' }),
    card({ id: 'ep',  rarity: 'EPIC' }),
    card({ id: 'r',   rarity: 'RARE' }),
    card({ id: 'un',  rarity: 'UNCOMMON' }),
    card({ id: 'co',  rarity: 'COMMON' }),
  ]

  it('returns featured ids in order when all are owned', () => {
    const result = resolveFeaturedCards(['ep', 'leg', 'r'], owned)
    expect(result.map((c) => c.id)).toEqual(['ep', 'leg', 'r'])
  })

  it('filters orphaned ids (cards no longer owned)', () => {
    const result = resolveFeaturedCards(['leg', 'recycled-id', 'r'], owned)
    expect(result.map((c) => c.id)).toEqual(['leg', 'r'])
  })

  it('falls back to pickTopByRarity when featured is empty', () => {
    const result = resolveFeaturedCards([], owned)
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
  })

  it('falls back to pickTopByRarity when all featured were recycled', () => {
    const result = resolveFeaturedCards(['gone1', 'gone2'], owned)
    expect(result).toHaveLength(5)
    expect(result[0]!.id).toBe('leg')
  })
})
