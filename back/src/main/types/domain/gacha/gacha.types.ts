import type {
  Card,
  CardSet,
  GachaPull,
  UserCard,
} from '../../../../generated/client'
import type { UnlockedAchievement } from '../../../domain/achievements/events.types'

export type { CardRarity, CardVariant } from '../../../../generated/client'

export type CardEntity = Card
export type CardSetEntity = CardSet
export type UserCardEntity = UserCard
export type GachaPullEntity = GachaPull

export type CardWithSet = Card & { set: CardSet }
export type UserCardWithCard = UserCard & { card: CardWithSet }
export type GachaPullWithCard = GachaPull & { card: CardWithSet }

export type PullResult = {
  pull: GachaPullEntity
  card: CardWithSet
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
  xpGained: number
  unlockedAchievements: UnlockedAchievement[]
  wasFreePull: boolean
  wasGoldenBall: boolean
  wasBoostGuarantee: boolean
}

export type PullBatchResult = {
  pulls: Array<{
    pull: GachaPullEntity
    card: CardWithSet
    wasDuplicate: boolean
    dustEarned: number
    pityCurrent: number
    wasFreePull: boolean
    wasGoldenBall: boolean
    wasBoostGuarantee: boolean
    // Succès débloqués par CETTE carte (événement PULL_COMPLETED). Rattachés à
    // la carte pour que le front puisse n'afficher la notif qu'au flip de la
    // carte concernée (anti-spoil). Les succès non liés à une carte
    // (TOKENS_SPENT, LEVEL_UP) restent au niveau `unlockedAchievements` global.
    unlockedAchievements: UnlockedAchievement[]
  }>
  tokensRemaining: number
  xpGained: number
  unlockedAchievements: UnlockedAchievement[]
}
