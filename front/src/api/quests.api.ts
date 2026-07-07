import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type QuestReward = {
  tokens: number
  dust: number
  xp: number
  gold: number
}

export type QuestEntry = {
  key: string
  name: string
  description: string
  progress: number
  target: number
  completed: boolean
  reward: QuestReward | null
}

export type WeeklyBonus = {
  completed: boolean
  reward: { gold: number; xp: number }
}

export type QuestsResponse = {
  weekly: QuestEntry[]
  weeklyBonus: WeeklyBonus
  oneshot: QuestEntry[]
}

export const QuestsApi = {
  get: async (): Promise<QuestsResponse> => {
    const res = await fetchWithAuth(`${apiUrl}/quests`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des quêtes')
    }
    return res.json()
  },
}
