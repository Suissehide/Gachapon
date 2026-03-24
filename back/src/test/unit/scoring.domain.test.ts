import { describe, expect, it } from '@jest/globals'
import type { CardRarity, CardVariant, ScoringConfig } from '../../generated/client'
import { calculateUserScore } from '../../main/domain/scoring/scoring.domain'

const defaultConfig: ScoringConfig = {
  id: 'singleton',
  commonPoints: 1,
  uncommonPoints: 3,
  rarePoints: 8,
  epicPoints: 20,
  legendaryPoints: 50,
  brilliantMultiplier: 1.5,
  holographicMultiplier: 2.0,
  updatedAt: new Date(),
}

type UserCardInput = { card: { rarity: CardRarity }; variant: CardVariant; quantity: number }

describe('calculateUserScore', () => {
  it('returns 0 for empty collection', () => {
    expect(calculateUserScore([], defaultConfig)).toBe(0)
  })

  it('scores a COMMON NORMAL card correctly', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'COMMON' }, variant: 'NORMAL', quantity: 1 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(1)
  })

  it('scores a LEGENDARY NORMAL card correctly', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'LEGENDARY' }, variant: 'NORMAL', quantity: 1 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(50)
  })

  it('applies BRILLIANT multiplier', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'RARE' }, variant: 'BRILLIANT', quantity: 1 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(8 * 1.5) // 12
  })

  it('applies HOLOGRAPHIC multiplier', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'EPIC' }, variant: 'HOLOGRAPHIC', quantity: 1 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(20 * 2.0) // 40
  })

  it('excludes cards with quantity = 0 (defensive guard)', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'LEGENDARY' }, variant: 'NORMAL', quantity: 0 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(0)
  })

  it('counts quantity > 1 only once', () => {
    const cards: UserCardInput[] = [{ card: { rarity: 'COMMON' }, variant: 'NORMAL', quantity: 5 }]
    expect(calculateUserScore(cards, defaultConfig)).toBe(1) // not 5
  })

  it('sums multiple cards correctly', () => {
    const cards: UserCardInput[] = [
      { card: { rarity: 'COMMON' }, variant: 'NORMAL', quantity: 1 },    // 1
      { card: { rarity: 'UNCOMMON' }, variant: 'NORMAL', quantity: 1 },  // 3
      { card: { rarity: 'RARE' }, variant: 'BRILLIANT', quantity: 1 },   // 8 * 1.5 = 12
    ]
    expect(calculateUserScore(cards, defaultConfig)).toBe(16)
  })

  it('owner of same card in NORMAL and HOLOGRAPHIC earns points for both', () => {
    const cards: UserCardInput[] = [
      { card: { rarity: 'RARE' }, variant: 'NORMAL', quantity: 1 },       // 8
      { card: { rarity: 'RARE' }, variant: 'HOLOGRAPHIC', quantity: 1 },  // 8 * 2 = 16
    ]
    expect(calculateUserScore(cards, defaultConfig)).toBe(24)
  })
})
