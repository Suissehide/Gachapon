import { describe, expect, it, jest } from '@jest/globals'
import { fourRaritiesOneDayHandler } from '../../../../main/domain/achievements/custom-handlers/four-rarities-one-day'

const event = {
  kind: 'PULL_COMPLETED' as const,
  cardId: 'c1',
  rarity: 'EPIC' as const,
  variant: 'NORMAL' as const,
  wasDuplicate: false,
}

describe('fourRaritiesOneDayHandler', () => {
  it('unlocked si COMMON, UNCOMMON, RARE, EPIC obtenus aujourd\'hui', async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { card: { rarity: 'COMMON' } },
          { card: { rarity: 'UNCOMMON' } },
          { card: { rarity: 'RARE' } },
          { card: { rarity: 'EPIC' } },
        ]),
      },
    } as any
    const result = await fourRaritiesOneDayHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si UNCOMMON manquante', async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { card: { rarity: 'COMMON' } },
          { card: { rarity: 'RARE' } },
          { card: { rarity: 'EPIC' } },
        ]),
      },
    } as any
    const result = await fourRaritiesOneDayHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
