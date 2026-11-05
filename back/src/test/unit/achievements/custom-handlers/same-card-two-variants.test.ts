import { describe, expect, it, jest } from '@jest/globals'
import { sameCardTwoVariantsHandler } from '../../../../main/domain/achievements/custom-handlers/same-card-two-variants'

const event = {
  kind: 'PULL_COMPLETED' as const,
  cardId: 'c1',
  rarity: 'COMMON' as const,
  variant: 'BRILLIANT' as const,
  wasDuplicate: false,
}

describe('sameCardTwoVariantsHandler', () => {
  it('unlocked si une carte porte un vernis en plus du normal', async () => {
    const tx = {
      userCard: { findFirst: jest.fn().mockResolvedValue({ id: 'uc1' }) },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it("non unlocked si aucune carte n'a de vernis", async () => {
    const tx = {
      userCard: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any
    const result = await sameCardTwoVariantsHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
