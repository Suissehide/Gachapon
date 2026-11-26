import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { SimulatorUnit } from './combat.api.ts'
import type { EquipmentDrop } from './equipment.api.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type StageStatus = 'cleared' | 'current' | 'locked'

export type RewardLoot = {
  gold: number
  dust: number
  xp: number
}

/** Lot unique d'une victoire de farm : parts en %, montants quand ils tombent. */
export type FarmDropPreview = {
  equipmentPct: number
  dustPct: number
  dustAmount: number
  energyPct: number
  energyAmount: number
}

export type RewardPreview = {
  firstClear: RewardLoot
  farm: RewardLoot
  farmEquipmentChance: number
  farmCardChance: number
  farmDrop: FarmDropPreview
  guaranteedEquipment: boolean
  guaranteedCard: boolean
}

export type CampaignStage = {
  id: string
  chapter: number
  index: number
  label: string
  isBoss: boolean
  status: StageStatus
  recommendedPower: number
  rewardPreview: RewardPreview
  enemies: {
    id: string
    imageUrl: string | null
    power: number
    element: string | null
  }[]
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

/** Carte obtenue en combat — même charge utile au combat unique et au balayage. */
export type CardDrop = {
  cardId: string
  name: string
  rarity: string
  wasDuplicate: boolean
  imageUrl: string | null
  element: string | null
  setName: string
}

export type BattleRewards = {
  gold: number
  dust: number
  xp: number
  xpBefore: number
  levelBefore: number
  isFirstClear: boolean
  /** Énergie gagnée quand le lot de la victoire est l'énergie, sinon 0. */
  energy: number
  equipmentDrop: EquipmentDrop | null
  cardDrop: CardDrop | null
}

export type BattleLogEntry = Record<string, unknown> & { type: string }

export type BattleResult = {
  won: boolean
  log: BattleLogEntry[]
  rewards: BattleRewards | null
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
}

export type WandererView = {
  stageId: string
  chapter: number
  index: number
  stageLabel: string
  expiresAt: string
  name: string
  imageUrl: string | null
  element: string | null
  recommendedPower: number
}

export type WandererLootView =
  | { kind: 'GOLD' | 'DUST' | 'TOKENS'; amount: number }
  | { kind: 'CARD'; amount: 1; card: CardDrop }

/** Même forme que `BattleResult`, sans `rewards` (le monstre errant ne donne
    pas le butin de farm) et avec le lot surprise tiré à la victoire. */
export type WandererBattleResult = Omit<BattleResult, 'rewards'> & {
  loot: WandererLootView | null
}

/**
 * Ce qu'un passage de balayage a rapporté, dans l'ordre des passages. Les
 * index pointent dans `equipmentDrops` / `cardDrops` du même résultat.
 */
export type SweepRunLot = {
  dust: number
  energy: number
  equipmentIndex: number | null
  cardIndex: number | null
}

export type SweepResult = {
  runs: number
  totalGold: number
  totalDust: number
  totalEnergy: number
  dustDrops: number[]
  energyDrops: number[]
  totalXp: number
  // État du joueur avant que l'XP du balayage ne soit créditée, pour détecter
  // la montée de niveau (cf. useLevelUpCelebration).
  xpBefore: number
  levelBefore: number
  equipmentDrops: EquipmentDrop[]
  cardDrops: CardDrop[]
  /** Un lot par passage, dans l'ordre. */
  runLots: SweepRunLot[]
  /** Énergie débitée pour l'ensemble du balayage. */
  energySpent: number
}

export const CampaignApi = {
  get: async (): Promise<Campaign> => {
    const res = await fetchWithAuth(`${apiUrl}/campaign`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('combat:apiTitles.campaign.load'))
    }
    return res.json()
  },

  battle: async (stageId: string): Promise<BattleResult> => {
    const res = await fetchWithAuth(
      `${apiUrl}/campaign/stages/${stageId}/battle`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('combat:apiTitles.battle'))
    }
    return res.json()
  },

  wanderer: async (): Promise<{ wanderer: WandererView | null }> => {
    const res = await fetchWithAuth(`${apiUrl}/campaign/wanderer`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('combat:apiTitles.campaign.wanderer'))
    }
    return res.json()
  },

  fightWanderer: async (): Promise<WandererBattleResult> => {
    const res = await fetchWithAuth(`${apiUrl}/campaign/wanderer/battle`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('combat:apiTitles.battle'))
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
      handleHttpError(res, {}, i18n.t('combat:apiTitles.campaign.sweep'))
    }
    return res.json()
  },
}
