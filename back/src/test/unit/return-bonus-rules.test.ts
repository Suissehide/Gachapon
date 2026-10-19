import { describe, expect, it } from '@jest/globals'
import { computeReturnChest } from '../../main/domain/return-bonus/return-bonus-rules'
import { utcDayGap } from '../../main/domain/streak/streak.domain'

const cfg = { minDays: 3, maxDays: 7, tokensPerDay: 7, energyPerDay: 21 }

describe('computeReturnChest', () => {
  it('pas de coffre sous le seuil', () => {
    expect(computeReturnChest(0, cfg)).toBeNull()
    expect(computeReturnChest(2, cfg)).toBeNull()
  })

  it('3 jours → 21 jetons / 63 énergie', () => {
    expect(computeReturnChest(3, cfg)).toEqual({ days: 3, cappedDays: 3, tokens: 21, energy: 63 })
  })

  it('7 jours → 49 / 147', () => {
    expect(computeReturnChest(7, cfg)).toEqual({ days: 7, cappedDays: 7, tokens: 49, energy: 147 })
  })

  it('au-delà du plafond : montants plafonnés, jours réels', () => {
    expect(computeReturnChest(12, cfg)).toEqual({ days: 12, cappedDays: 7, tokens: 49, energy: 147 })
  })
})

describe('utcDayGap', () => {
  it('compte les jours calendaires UTC', () => {
    expect(utcDayGap(new Date('2026-10-12T23:59:00Z'), new Date('2026-10-15T00:01:00Z'))).toBe(3)
    expect(utcDayGap(new Date('2026-10-15T01:00:00Z'), new Date('2026-10-15T23:00:00Z'))).toBe(0)
  })
})
