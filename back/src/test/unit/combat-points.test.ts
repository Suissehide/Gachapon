import { describe, expect, it } from '@jest/globals'

import { calculateCombatPoints } from '../../main/domain/combat-points/combat-points.domain'

describe('calculateCombatPoints', () => {
  it('returns same value when already at max', () => {
    const state = calculateCombatPoints(new Date(), 60, 360, 60)
    expect(state.combatPoints).toBe(60)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('returns same value when over max (defensive)', () => {
    const state = calculateCombatPoints(new Date(), 65, 360, 60)
    expect(state.combatPoints).toBe(65)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('initializes clock when lastCombatPointAt is null', () => {
    const state = calculateCombatPoints(null, 30, 360, 60)
    expect(state.combatPoints).toBe(30)
    expect(state.newLastCombatPointAt).toBeInstanceOf(Date)
    expect(state.nextCombatPointAt).toBeInstanceOf(Date)
    // next = now + 360s
    const diffMs = state.nextCombatPointAt!.getTime() - state.newLastCombatPointAt.getTime()
    expect(diffMs).toBe(360 * 1000)
  })

  it('returns same value when elapsed < one interval', () => {
    const last = new Date(Date.now() - 100 * 1000) // 100 seconds ago
    const state = calculateCombatPoints(last, 30, 360, 60)
    expect(state.combatPoints).toBe(30)
    expect(state.nextCombatPointAt).toBeInstanceOf(Date)
  })

  it('adds N points when elapsed >= N intervals', () => {
    // 3 intervals = 1080 seconds
    const last = new Date(Date.now() - 1080 * 1000 - 100)
    const state = calculateCombatPoints(last, 30, 360, 60)
    expect(state.combatPoints).toBe(33)
  })

  it('caps at maxStock when elapsed exceeds full regen', () => {
    // 1000 intervals worth of time
    const last = new Date(Date.now() - 1000 * 360 * 1000)
    const state = calculateCombatPoints(last, 10, 360, 60)
    expect(state.combatPoints).toBe(60)
    expect(state.nextCombatPointAt).toBeNull()
  })

  it('advances newLastCombatPointAt by N intervals (not just elapsed)', () => {
    const baseMs = Date.now() - 1080 * 1000 - 50
    const last = new Date(baseMs)
    const state = calculateCombatPoints(last, 10, 360, 60)
    expect(state.combatPoints).toBe(13)
    // newLast should be base + 3 × 360s
    expect(state.newLastCombatPointAt.getTime()).toBe(baseMs + 3 * 360 * 1000)
  })
})
