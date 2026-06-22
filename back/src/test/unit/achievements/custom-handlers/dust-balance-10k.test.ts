import { describe, expect, it, jest } from '@jest/globals'
import { dustBalance10kHandler } from '../../../../main/domain/achievements/custom-handlers/dust-balance-10k'

const event = { kind: 'REWARD_CLAIMED' as const, rewardId: 'r1', source: 'STREAK' as const }

describe('dustBalance10kHandler', () => {
  it('unlocked si dust >= 10000', async () => {
    const tx = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ dust: 12000 }) },
    } as any
    const result = await dustBalance10kHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si dust < 10000', async () => {
    const tx = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ dust: 9000 }) },
    } as any
    const result = await dustBalance10kHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
