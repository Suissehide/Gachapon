import { describe, expect, it, jest } from '@jest/globals'
import { sameCardTwoVariantsHandler } from '../../../../main/domain/achievements/custom-handlers/same-card-two-variants'

const event = {
  kind: 'PULL_COMPLETED' as const,
  cardId: 'c1',
  rarity: 'COMMON' as const,
  variant: 'BRILLIANT' as const,
}

describe('sameCardTwoVariantsHandler', () => {
  it('unlocked si une cardId possédée avec 2 variants distincts', async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { cardId: 'c1', variant: 'NORMAL' },
          { cardId: 'c1', variant: 'BRILLIANT' },
        ]),
      },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it("non unlocked si chaque cardId n'a qu'un seul variant", async () => {
    const tx = {
      userCard: {
        findMany: jest.fn().mockResolvedValue([
          { cardId: 'c1', variant: 'NORMAL' },
          { cardId: 'c2', variant: 'NORMAL' },
        ]),
      },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
