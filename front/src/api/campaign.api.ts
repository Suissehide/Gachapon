import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { SimulatorUnit } from './combat.api.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type StageStatus = 'cleared' | 'current' | 'locked'

export type CampaignStage = {
  id: string
  chapter: number
  index: number
  label: string
  isBoss: boolean
  status: StageStatus
}

export type CampaignChapter = {
  chapter: number
  stages: CampaignStage[]
}

export type Campaign = {
  highestChapter: number
  highestIndex: number
  chapters: CampaignChapter[]
}

export type BattleRewards = {
  gold: number
  dust: number
  xp: number
  xpBefore: number
  levelBefore: number
  isFirstClear: boolean
  equipmentDrop: {
    userEquipmentId: string
    equipmentId: string
    name: string
    rarity: string
  } | null
  cardDrop: {
    cardId: string
    name: string
    rarity: string
    wasDuplicate: boolean
  } | null
}

export type BattleLogEntry = Record<string, unknown> & { type: string }

export type BattleResult = {
  won: boolean
  log: BattleLogEntry[]
  rewards: BattleRewards | null
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
}

export type SweepResult = {
  runs: number
  totalGold: number
  totalDust: number
  totalXp: number
  equipmentDrops: { equipmentId: string; name: string; rarity: string }[]
  cardDrops: { cardId: string; name: string; rarity: string }[]
}

export const CampaignApi = {
  get: async (): Promise<Campaign> => {
    const res = await fetchWithAuth(`${apiUrl}/campaign`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement de la campagne')
    }
    return res.json()
  },

  battle: async (stageId: string): Promise<BattleResult> => {
    const res = await fetchWithAuth(
      `${apiUrl}/campaign/stages/${stageId}/battle`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du combat')
    }
    return res.json()
  },

  sweep: async (stageId: string, runs: number): Promise<SweepResult> => {
    const res = await fetchWithAuth(
      `${apiUrl}/campaign/stages/${stageId}/sweep`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runs }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du sweep')
    }
    return res.json()
  },
}
