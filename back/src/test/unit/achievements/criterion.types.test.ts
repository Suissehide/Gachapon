import { describe, expect, it } from '@jest/globals'
import { AchievementCriterionSchema } from '../../../main/domain/achievements/criterion.types'

describe('AchievementCriterionSchema', () => {
  it('accepte PULL_COUNT valide', () => {
    const parsed = AchievementCriterionSchema.parse({ type: 'PULL_COUNT', threshold: 100 })
    expect(parsed.type).toBe('PULL_COUNT')
  })

  it('rejette PULL_COUNT sans threshold', () => {
    expect(() => AchievementCriterionSchema.parse({ type: 'PULL_COUNT' })).toThrow()
  })

  it('accepte OWN_RARITY_COUNT avec variant optionnel', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'OWN_RARITY_COUNT',
      rarity: 'EPIC',
      variant: 'HOLOGRAPHIC',
      threshold: 1,
    })
    expect(parsed).toMatchObject({ rarity: 'EPIC', variant: 'HOLOGRAPHIC' })
  })

  it('accepte COLLECTION_COMPLETE ALL', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'COLLECTION_COMPLETE',
      scope: 'ALL',
    })
    expect(parsed.type).toBe('COLLECTION_COMPLETE')
  })

  it('accepte COLLECTION_COMPLETE avec rareté', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'COLLECTION_COMPLETE',
      scope: { rarity: 'COMMON' },
    })
    expect(parsed.type).toBe('COLLECTION_COMPLETE')
  })

  it('accepte CUSTOM_EVENT avec handlerKey', () => {
    const parsed = AchievementCriterionSchema.parse({
      type: 'CUSTOM_EVENT',
      handlerKey: 'first_pull_ever',
    })
    expect(parsed).toMatchObject({ handlerKey: 'first_pull_ever' })
  })

  it('rejette un type inconnu', () => {
    expect(() => AchievementCriterionSchema.parse({ type: 'NOT_A_TYPE' })).toThrow()
  })
})
