import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type { CardRarity } from '../gacha/gacha.types'

export type RecycleInput = {
  cardId: string
  quantity: number
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
}

export type RecycleResult = {
  dustEarned: number
  newDustTotal: number
  unlockedAchievements: UnlockedAchievement[]
}

export type RecycleAllResult = {
  dustEarned: number
  cardsRecycled: number
  newDustTotal: number
  unlockedAchievements: UnlockedAchievement[]
  // Copies (pas lignes) laissées de côté parce qu'engagées dans un duel
  // ACTIVE : ignorées plutôt que refusées — un recyclage de masse ne doit
  // pas échouer en bloc pour une carte verrouillée (voir DuelDomain, tâche 7).
  // Même base que cardsRecycled (copies) : les deux valeurs sont affichées
  // côte à côte au joueur et doivent rester comparables.
  skippedEngaged: number
}

export interface ICollectionDomain {
  recycleCard(userId: string, input: RecycleInput): Promise<RecycleResult>
  recycleAllBelow(
    userId: string,
    maxRarity: CardRarity,
  ): Promise<RecycleAllResult>
}
