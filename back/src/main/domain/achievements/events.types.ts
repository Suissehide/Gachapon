import type { CardRarity, CardVariant } from '../../../generated/enums'

export type AchievementEvent =
  | {
      kind: 'PULL_COMPLETED'
      cardId: string
      rarity: CardRarity
      variant: CardVariant
      wasDuplicate: boolean
    }
  | { kind: 'TOKENS_SPENT'; amount: number }
  | { kind: 'DUST_SPENT'; amount: number }
  | { kind: 'CARD_RECYCLED'; amount: number }
  | {
      kind: 'REWARD_CLAIMED'
      rewardId: string
      source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST' | 'LEVEL_UP' | 'ADMIN'
    }
  | { kind: 'LEVEL_UP'; newLevel: number }
  | { kind: 'STREAK_UPDATED'; days: number }
  | { kind: 'MACHINE_PURCHASED'; machineId: string }
  | {
      kind: 'STAGE_CLEARED'
      /**
       * Campagne ou tour (G2, relecture finale) : les compteurs de
       * progression de campagne (STAGES_CLEARED_COUNT, BOSS_DEFEATS_COUNT)
       * ne doivent compter que 'CAMPAIGN' — voir stageClearedDelta dans
       * counter-dispatcher.ts. Les quêtes, elles, ne regardent que `kind`
       * et comptent les deux sources sans changement (quest-matching.ts).
       */
      source: 'CAMPAIGN' | 'TOWER'
      isBoss: boolean
      viaSweep: boolean
      flawless: boolean
      understaffed: boolean
    }
  | { kind: 'CARD_LEVELED'; levels: number }
  | { kind: 'GOLD_SPENT'; amount: number }
  | { kind: 'TEAM_JOINED' }
  /**
   * Une pièce d'équipement obtenue (drop de tour, drop de ferme campagne,
   * drop garanti de premier clear ou de boss). Un événement PAR pièce, jamais
   * agrégé : la quête « Butin de Qualité » filtre sur `rarity`, ce qu'un
   * compteur agrégé rendrait impossible.
   */
  | { kind: 'EQUIPMENT_OBTAINED'; equipmentId: string; rarity: CardRarity }
  /** `amount` = niveaux gagnés (1 par appel à equipment.upgrade). */
  | { kind: 'EQUIPMENT_UPGRADED'; amount: number }
  /** `amount` = nombre de pièces détruites en un seul recyclage. */
  | { kind: 'EQUIPMENT_SALVAGED'; amount: number }

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
