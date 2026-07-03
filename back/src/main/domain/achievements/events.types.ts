import type { CardRarity, CardVariant } from '../../../generated/enums'

export type AchievementEvent =
  | {
      kind: 'PULL_COMPLETED'
      cardId: string
      rarity: CardRarity
      variant: CardVariant
    }
  | { kind: 'TOKENS_SPENT'; amount: number }
  | { kind: 'DUST_SPENT'; amount: number }
  | { kind: 'CARD_RECYCLED'; amount: number }
  | {
      kind: 'REWARD_CLAIMED'
      rewardId: string
      source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST'
    }
  | { kind: 'LEVEL_UP'; newLevel: number }
  | { kind: 'STREAK_UPDATED'; days: number }
  | { kind: 'MACHINE_PURCHASED'; machineId: string }

export type AchievementEventKind = AchievementEvent['kind']

export interface UnlockedAchievement {
  key: string
  name: string
  iconKey: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: CardRarity | null
  } | null
}
