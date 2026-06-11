import { describe, expect, it } from '@jest/globals'
import { computeDelta } from '../../../main/domain/achievements/counter-dispatcher'

describe('computeDelta', () => {
  it('PULL_COMPLETED → PULL_COUNT +1', () => {
    expect(
      computeDelta(
        { type: 'PULL_COUNT', threshold: 10 },
        { kind: 'PULL_COMPLETED', cardId: 'c1', rarity: 'COMMON', variant: 'NORMAL' },
      ),
    ).toBe(1)
  })

  it('DUST_SPENT event → DUST_SPENT criterion += amount', () => {
    expect(
      computeDelta(
        { type: 'DUST_SPENT', threshold: 500 },
        { kind: 'DUST_SPENT', amount: 42 },
      ),
    ).toBe(42)
  })

  it('CARD_RECYCLED event → CARDS_RECYCLED += amount', () => {
    expect(
      computeDelta(
        { type: 'CARDS_RECYCLED', threshold: 10 },
        { kind: 'CARD_RECYCLED', amount: 3 },
      ),
    ).toBe(3)
  })

  it('REWARD_CLAIMED → REWARDS_CLAIMED +1', () => {
    expect(
      computeDelta(
        { type: 'REWARDS_CLAIMED', threshold: 5 },
        { kind: 'REWARD_CLAIMED', rewardId: 'r1', source: 'STREAK' },
      ),
    ).toBe(1)
  })

  it('event/criterion mismatch → 0', () => {
    expect(
      computeDelta(
        { type: 'PULL_COUNT', threshold: 10 },
        { kind: 'DUST_SPENT', amount: 42 },
      ),
    ).toBe(0)
  })
})
