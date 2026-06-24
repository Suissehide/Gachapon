import { describe, expect, it } from '@jest/globals'

import { computeFinalStats } from '../../main/domain/combat/combat-stats.domain'

const BASE = {
  baseHp: 200,
  baseAtk: 20,
  baseDef: 10,
  baseSpd: 100,
}

describe('combat-stats: computeFinalStats', () => {
  it('returns base stats at level 1, palier 1, NORMAL, no equipment', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
    })
    expect(stats).toEqual({ hp: 200, atk: 20, def: 10, spd: 100 })
  })

  it('applies +6% per level beyond level 1', () => {
    // level 10 = +54% growth
    const stats = computeFinalStats({
      ...BASE,
      level: 10,
      palier: 1,
      variant: 'NORMAL',
    })
    // hp 200 × 1.54 = 308
    expect(stats.hp).toBe(308)
    expect(stats.atk).toBe(31) // round(20 × 1.54) = round(30.8)
  })

  it('applies variant multiplier (BRILLIANT ×1.15)', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'BRILLIANT',
    })
    expect(stats.hp).toBe(230) // 200 × 1.15
  })

  it('applies HOLOGRAPHIC ×1.30', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'HOLOGRAPHIC',
    })
    expect(stats.hp).toBe(260) // 200 × 1.30
  })

  it('compounds palier ascension bonus (+15% per palier)', () => {
    // palier 2 = ×1.15, palier 6 = ×1.15^5 = ×2.011...
    const palier2 = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 2,
      variant: 'NORMAL',
    })
    expect(palier2.hp).toBe(230) // 200 × 1.15

    const palier6 = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 6,
      variant: 'NORMAL',
    })
    // 200 × 1.15^5 ≈ 402.27
    expect(palier6.hp).toBe(402)
  })

  it('combines level + variant + palier multiplicatively', () => {
    // level 10 (+54%), HOLOGRAPHIC (×1.30), palier 2 (×1.15)
    // 200 × 1.54 × 1.30 × 1.15 = 460.46 → 460
    const stats = computeFinalStats({
      ...BASE,
      level: 10,
      palier: 2,
      variant: 'HOLOGRAPHIC',
    })
    expect(stats.hp).toBe(460)
  })

  it('adds equipment flat bonuses', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      equipment: [
        { atkFlat: 5 },
        { atkFlat: 8, hpFlat: 10 },
      ],
    })
    expect(stats.atk).toBe(33) // 20 + 5 + 8
    expect(stats.hp).toBe(210) // 200 + 10
  })

  it('applies equipment percent bonuses on top of flat', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      equipment: [
        { atkFlat: 10, atkPct: 10 },
      ],
    })
    // (20 + 10) × 1.10 = 33
    expect(stats.atk).toBe(33)
  })

  it('sums multiple equipment percent bonuses additively', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      equipment: [
        { hpPct: 5 },
        { hpPct: 10 },
      ],
    })
    // 200 × (1 + 15/100) = 230
    expect(stats.hp).toBe(230)
  })

  it('handles missing skillModifiers (defaults to {})', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
    })
    expect(stats.hp).toBe(200)
  })

  it('applies skillModifiers percent on top of equipment', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      equipment: [{ atkFlat: 10 }],
      skillModifiers: { atkPct: 20 },
    })
    // (20 + 10) × (1 + 20/100) = 36
    expect(stats.atk).toBe(36)
  })

  it('treats missing equipment as empty list', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
    })
    expect(stats.atk).toBe(20)
  })

  it('rounds final values to integers', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 2, // +6% → 21.2
      palier: 1,
      variant: 'NORMAL',
    })
    expect(stats.atk).toBe(21)
    expect(Number.isInteger(stats.atk)).toBe(true)
    expect(Number.isInteger(stats.hp)).toBe(true)
    expect(Number.isInteger(stats.def)).toBe(true)
    expect(Number.isInteger(stats.spd)).toBe(true)
  })
})
