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

import { jest } from '@jest/globals'
import { StreakDomain } from '../../main/domain/streak/streak.domain'

describe('StreakDomain.updateStreak', () => {
  const mockUserRepo = {
    findByIdOrThrowInTx: jest.fn<(...args: any[]) => Promise<any>>(),
    updateStreakInTx: jest.fn<(...args: any[]) => Promise<void>>(),
  }
  const mockMilestoneRepo = {
    findExactMilestoneForDay: jest.fn<(...args: any[]) => Promise<any>>(),
    findDefault: jest.fn<(...args: any[]) => Promise<any>>(),
    findAllActive: jest.fn<(...args: any[]) => Promise<any[]>>(),
  }
  const mockUserRewardRepo = {
    upsertInTx: jest.fn<(...args: any[]) => Promise<void>>(),
  }
  const domain = new StreakDomain({
    userRepository: mockUserRepo as any,
    streakMilestoneRepository: mockMilestoneRepo as any,
    userRewardRepository: mockUserRewardRepo as any,
  })
  const fakeTx = {} as any

  beforeEach(() => {
    jest.clearAllMocks()
    mockUserRepo.updateStreakInTx.mockResolvedValue(undefined)
    mockUserRewardRepo.upsertInTx.mockResolvedValue(undefined)
  })

  it('grants exact milestone reward when day matches a milestone', async () => {
    mockUserRepo.findByIdOrThrowInTx.mockResolvedValue({
      lastLoginAt: null, streakDays: 0, bestStreak: 0,
    })
    const milestone = { id: 'ms-1', rewardId: 'rw-1', reward: { tokens: 5, dust: 8, xp: 15 } }
    mockMilestoneRepo.findExactMilestoneForDay.mockResolvedValue(milestone)

    await domain.updateStreak('user-1', fakeTx)

    expect(mockMilestoneRepo.findExactMilestoneForDay).toHaveBeenCalledWith(1)
    expect(mockMilestoneRepo.findDefault).not.toHaveBeenCalled()
    expect(mockUserRewardRepo.upsertInTx).toHaveBeenCalledWith(fakeTx, expect.objectContaining({
      rewardId: 'rw-1', source: 'STREAK', sourceId: 'ms-1',
    }))
  })

  it('grants default reward when day has no milestone', async () => {
    mockUserRepo.findByIdOrThrowInTx.mockResolvedValue({
      lastLoginAt: null, streakDays: 0, bestStreak: 0,
    })
    const defaultMilestone = { id: 'ms-0', rewardId: 'rw-0', reward: { tokens: 2, dust: 3, xp: 5 } }
    mockMilestoneRepo.findExactMilestoneForDay.mockResolvedValue(null)
    mockMilestoneRepo.findDefault.mockResolvedValue(defaultMilestone)

    await domain.updateStreak('user-1', fakeTx)

    expect(mockMilestoneRepo.findExactMilestoneForDay).toHaveBeenCalledWith(1)
    expect(mockMilestoneRepo.findDefault).toHaveBeenCalled()
    expect(mockUserRewardRepo.upsertInTx).toHaveBeenCalledWith(fakeTx, expect.objectContaining({
      rewardId: 'rw-0', source: 'STREAK', sourceId: 'ms-0',
    }))
  })

  it('skips reward grant when same-day login', async () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    mockUserRepo.findByIdOrThrowInTx.mockResolvedValue({
      lastLoginAt: today, streakDays: 3, bestStreak: 3,
    })

    await domain.updateStreak('user-1', fakeTx)

    expect(mockMilestoneRepo.findExactMilestoneForDay).not.toHaveBeenCalled()
    expect(mockUserRewardRepo.upsertInTx).not.toHaveBeenCalled()
  })
})
