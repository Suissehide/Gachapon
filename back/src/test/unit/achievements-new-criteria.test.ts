import { computeDelta } from '../../main/domain/achievements/counter-dispatcher'
import { computeStateProgress } from '../../main/domain/achievements/state-dispatcher'
import type { UserAchievementState } from '../../main/domain/achievements/state-dispatcher'

const stageEvent = (
  over: Partial<{
    isBoss: boolean
    viaSweep: boolean
    flawless: boolean
    understaffed: boolean
  }> = {},
) =>
  ({
    kind: 'STAGE_CLEARED' as const,
    isBoss: false,
    viaSweep: false,
    flawless: false,
    understaffed: false,
    ...over,
  })

describe('computeDelta — critères pilotés par STAGE_CLEARED', () => {
  it('STAGES_CLEARED_COUNT : +1 sur un vrai combat, 0 en sweep', () => {
    expect(
      computeDelta({ type: 'STAGES_CLEARED_COUNT', threshold: 1 }, stageEvent()),
    ).toBe(1)
    expect(
      computeDelta(
        { type: 'STAGES_CLEARED_COUNT', threshold: 1 },
        stageEvent({ viaSweep: true }),
      ),
    ).toBe(0)
  })

  it('BOSS_DEFEATS_COUNT : +1 seulement sur un boss non-sweep', () => {
    expect(
      computeDelta(
        { type: 'BOSS_DEFEATS_COUNT', threshold: 1 },
        stageEvent({ isBoss: true }),
      ),
    ).toBe(1)
    expect(
      computeDelta(
        { type: 'BOSS_DEFEATS_COUNT', threshold: 1 },
        stageEvent({ isBoss: true, viaSweep: true }),
      ),
    ).toBe(0)
  })

  it('FLAWLESS / UNDERSTAFFED : +1 selon le flag', () => {
    expect(
      computeDelta(
        { type: 'FLAWLESS_CLEARS_COUNT', threshold: 1 },
        stageEvent({ flawless: true }),
      ),
    ).toBe(1)
    expect(
      computeDelta(
        { type: 'UNDERSTAFFED_CLEARS_COUNT', threshold: 1 },
        stageEvent({ understaffed: true }),
      ),
    ).toBe(1)
  })
})

const baseState = (over: Partial<UserAchievementState> = {}): UserAchievementState => ({
  ownedByRarity: {} as UserAchievementState['ownedByRarity'],
  ownedByRarityVariant: {},
  completedCollections: { ALL: false },
  completedSetsCount: 0,
  level: 1,
  streakDays: 0,
  machinesOwned: 0,
  highestChapter: 1,
  cardsAtMaxLevel: 0,
  ...over,
})

describe('computeStateProgress — nouveaux critères d\'état', () => {
  it('CAMPAIGN_CHAPTER_REACHED : débloqué quand highestChapter atteint le seuil', () => {
    expect(
      computeStateProgress(
        { type: 'CAMPAIGN_CHAPTER_REACHED', threshold: 2 },
        baseState({ highestChapter: 2 }),
      ),
    ).toEqual({ progress: 2, threshold: 2, unlocked: true })
  })

  it('CARDS_AT_MAX_LEVEL : compte les cartes maxées', () => {
    expect(
      computeStateProgress(
        { type: 'CARDS_AT_MAX_LEVEL', threshold: 1 },
        baseState({ cardsAtMaxLevel: 1 }),
      ),
    ).toEqual({ progress: 1, threshold: 1, unlocked: true })
  })
})
