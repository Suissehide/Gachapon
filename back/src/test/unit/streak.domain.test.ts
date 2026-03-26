import { describe, expect, it } from '@jest/globals'
import { calculateStreakUpdate } from '../../main/domain/streak/streak.domain'

const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setTime(d.getTime() - n * DAY)
  return d
}

describe('calculateStreakUpdate', () => {
  it('first login: streak = 1, bestStreak = 1', () => {
    const result = calculateStreakUpdate({ lastLoginAt: null, streakDays: 0, bestStreak: 0 })
    expect(result.newStreakDays).toBe(1)
    expect(result.newBestStreak).toBe(1)
    expect(result.shouldSkip).toBe(false)
  })

  it('same day login: returns shouldSkip = true', () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const result = calculateStreakUpdate({ lastLoginAt: today, streakDays: 5, bestStreak: 5 })
    expect(result.shouldSkip).toBe(true)
  })

  it('consecutive day: increments streak', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(1), streakDays: 4, bestStreak: 4 })
    expect(result.newStreakDays).toBe(5)
    expect(result.newBestStreak).toBe(5)
    expect(result.shouldSkip).toBe(false)
  })

  it('missed day: resets streak to 1, preserves bestStreak', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(2), streakDays: 10, bestStreak: 10 })
    expect(result.newStreakDays).toBe(1)
    expect(result.newBestStreak).toBe(10)
    expect(result.shouldSkip).toBe(false)
  })

  it('new bestStreak captured when streak grows', () => {
    const result = calculateStreakUpdate({ lastLoginAt: daysAgo(1), streakDays: 7, bestStreak: 7 })
    expect(result.newStreakDays).toBe(8)
    expect(result.newBestStreak).toBe(8)
  })
})
