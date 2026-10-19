import { describe, expect, it } from '@jest/globals'
import {
  computeLoot,
  pickLootKind,
  pickMonsterStage,
  pickSpawnDelayMinutes,
} from '../../main/domain/campaign/wandering-monster-rules'

describe('pickSpawnDelayMinutes', () => {
  it('délai entre 60 et 360 minutes', () => {
    expect(pickSpawnDelayMinutes(60, 360, () => 0)).toBe(60)
    expect(pickSpawnDelayMinutes(60, 360, () => 0.999999)).toBe(360)
  })
})

describe('pickMonsterStage', () => {
  const progress = { highestChapter: 3, highestIndex: 4 }
  const stages = [1, 2, 3].flatMap((chapter) =>
    [1, 2, 3, 4, 5].map((index) => ({ chapter, index })),
  )

  it('étage battu du chapitre le plus avancé', () => {
    for (const r of [0, 0.3, 0.7, 0.999]) {
      const s = pickMonsterStage(stages, progress, () => r)
      expect(s?.chapter).toBe(3)
      expect(s?.index).toBeLessThanOrEqual(4)
    }
  })

  it('aucun étage battu → null', () => {
    expect(
      pickMonsterStage(stages, { highestChapter: 1, highestIndex: 0 }, () => 0),
    ).toBeNull()
  })
})

describe('pickLootKind', () => {
  it('quatre lots à poids égaux', () => {
    expect([0, 0.25, 0.5, 0.75].map((r) => pickLootKind(() => r))).toEqual([
      'GOLD',
      'DUST',
      'TOKENS',
      'CARD',
    ])
  })
})

describe('computeLoot', () => {
  it('montants du butin', () => {
    const farm = { gold: 91, dust: 24 }
    const cfg = { lootMult: 5, tokens: 5 }
    expect(computeLoot('GOLD', farm, cfg)).toEqual({ kind: 'GOLD', amount: 455 })
    expect(computeLoot('DUST', farm, cfg)).toEqual({ kind: 'DUST', amount: 120 })
    expect(computeLoot('TOKENS', farm, cfg)).toEqual({ kind: 'TOKENS', amount: 5 })
    expect(computeLoot('CARD', farm, cfg)).toEqual({ kind: 'CARD', amount: 1 })
  })
})
