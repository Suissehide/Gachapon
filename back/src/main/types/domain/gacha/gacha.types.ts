import type { GachaPull, UserCard } from '../../../../generated/client'
import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type { LocalizedCard, LocalizedCardSet } from '../../infra/orm/localized'

export type {
  CardElement,
  CardRarity,
  CardVariant,
} from '../../../../generated/client'

/**
 * `LocalizedCard`/`LocalizedCardSet` et non les types Prisma bruts : depuis
 * l'i18n, `name`/`description` sont des champs CALCULÉS de
 * `localized.extension.ts`, absents du type brut. Toute la chaîne qui part
 * d'ici (CardWithSet → routes gacha/collection/profil) lit `card.name` sans
 * savoir qu'il y a deux colonnes derrière, et c'est le but.
 */
export type CardEntity = LocalizedCard
export type CardSetEntity = LocalizedCardSet
export type UserCardEntity = UserCard
export type GachaPullEntity = GachaPull

export type CardWithSet = LocalizedCard & { set: LocalizedCardSet }
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
  leveledUp?: { from: number; to: number }
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
    leveledUp?: { from: number; to: number }
  }>
  tokensRemaining: number
  xpGained: number
  unlockedAchievements: UnlockedAchievement[]
  leveledUp?: { from: number; to: number }
}
