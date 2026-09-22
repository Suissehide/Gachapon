import type { UnlockedAchievement } from '../constants/achievements.constant.ts'
import type {
  Card,
  CardSet,
  CardVariant,
  UserCard,
} from '../constants/card.constant.ts'
import { CARD_ROUTES } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { CardSet, CardVariant, Card, UserCard }

export type BulkRecycleMaxRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC'

export const CollectionApi = {
  getSets: async (): Promise<{ sets: CardSet[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${CARD_ROUTES.sets}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('collection:apiTitles.operations.loadSets'),
      )
    }
    return res.json()
  },

  getCards: async (filter?: {
    setId?: string
    rarity?: string
  }): Promise<{ cards: Card[] }> => {
    const params = new URLSearchParams()
    if (filter?.setId) {
      params.set('setId', filter.setId)
    }
    if (filter?.rarity) {
      params.set('rarity', filter.rarity)
    }
    const qs = params.toString()
    const res = await fetchWithAuth(
      `${apiUrl}${CARD_ROUTES.cards}${qs ? `?${qs}` : ''}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('collection:apiTitles.operations.loadCards'),
      )
    }
    return res.json()
  },

  getUserCollection: async (userId: string): Promise<{ cards: UserCard[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${CARD_ROUTES.collection(userId)}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('collection:apiTitles.operations.loadCollection'),
      )
    }
    return res.json()
  },

  recycle: async (
    cardId: string,
    quantity: number,
    variant: CardVariant,
  ): Promise<{
    dustEarned: number
    newDustTotal: number
    unlockedAchievements?: UnlockedAchievement[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${CARD_ROUTES.recycle}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, quantity, variant }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('collection:recycle.errorTitle'))
    }
    return res.json()
  },

  recycleAll: async (
    maxRarity: BulkRecycleMaxRarity,
  ): Promise<{
    dustEarned: number
    cardsRecycled: number
    // Copies laissées en place parce qu'un duel en cours les verrouille —
    // comptées en copies, comme `cardsRecycled` : les deux sont affichés
    // cote a cote dans le toast de fin de recyclage.
    skippedEngaged: number
    newDustTotal: number
    unlockedAchievements?: UnlockedAchievement[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${CARD_ROUTES.recycleAll}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxRarity }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('collection:recycleAll.errorTitle'))
    }
    return res.json()
  },

  convertDoublonsToDust: async (
    userCardId: string,
    amount: number,
  ): Promise<{ dustEarned: number; remainingQuantity: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/cards/${userCardId}/dust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('collection:apiTitles.operations.convertToDust'),
      )
    }
    return res.json()
  },

  levelUpCard: async (
    userCardId: string,
    targetLevel: number,
  ): Promise<{
    newLevel: number
    goldSpent: number
    dustSpent: number
    newGold: number
    newDust: number
  }> => {
    const res = await fetchWithAuth(`${apiUrl}/cards/${userCardId}/level-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetLevel }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('collection:apiTitles.operations.levelUp'),
      )
    }
    return res.json()
  },

  ascendCard: async (
    userCardId: string,
  ): Promise<{
    newPalier: number
    doublonsSpent: number
    remainingQuantity: number
  }> => {
    const res = await fetchWithAuth(`${apiUrl}/cards/${userCardId}/ascend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('collection:apiTitles.operations.ascend'))
    }
    return res.json()
  },
}
