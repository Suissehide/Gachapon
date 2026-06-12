import { describe, expect, it, jest } from '@jest/globals'
import { firstPullEverHandler } from '../../../../main/domain/achievements/custom-handlers/first-pull-ever'

describe('firstPullEverHandler', () => {
  it('unlocked quand le user a exactement 1 carte', async () => {
    const tx = {
      userCard: { count: jest.fn().mockResolvedValue(1) },
    } as any
    const result = await firstPullEverHandler.evaluate(tx, 'u1', {
      kind: 'PULL_COMPLETED',
      cardId: 'c1',
      rarity: 'COMMON',
      variant: 'NORMAL',
    })
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si plusieurs cartes', async () => {
    const tx = {
      userCard: { count: jest.fn().mockResolvedValue(5) },
    } as any
    const result = await firstPullEverHandler.evaluate(tx, 'u1', {
      kind: 'PULL_COMPLETED',
      cardId: 'c1',
      rarity: 'COMMON',
      variant: 'NORMAL',
    })
    expect(result.unlocked).toBe(false)
  })
})
