import type { CardRarity } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'
import type { TowerElement } from './tower.api.ts'

export type RaidBossSpec = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  level: number
  palier: number
  attackPattern?:
    | 'BASIC'
    | 'AOE_3'
    | 'MULTI_2'
    | 'MONO_AMPLIFIED'
    | 'MONO_DOUBLE'
  passiveKey?: string | null
  element?: string | null
  appearance?: string | null
  mitigationScale: number
  critRate?: number
  critDmg?: number
  armorPen?: number
  lifesteal?: number
}

export type AdminRaidBoss = {
  id: string
  element: TowerElement
  name: string
  nameFr: string
  nameEn: string
  spec: RaidBossSpec
  updatedAt: string
}

export type AdminRaidTier = {
  id: string
  pct: number
  tokens: number
  dust: number
  gold: number
  xp: number
  cardRarity: CardRarity | null
}

export type RaidTierPatch = Partial<Omit<AdminRaidTier, 'id' | 'pct'>>

export const AdminRaidApi = {
  getBosses: async (): Promise<{ bosses: AdminRaidBoss[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/raid/bosses`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.raid.loadBosses'))
    }
    return res.json()
  },
  patchBoss: async (
    element: TowerElement,
    data: { nameFr?: string; nameEn?: string; spec?: RaidBossSpec },
  ): Promise<AdminRaidBoss> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/raid/bosses/${element}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.raid.updateBoss'))
    }
    return res.json()
  },
  getTiers: async (): Promise<{ tiers: AdminRaidTier[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/raid/tiers`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.raid.loadTiers'))
    }
    return res.json()
  },
  patchTier: async (
    pct: number,
    data: RaidTierPatch,
  ): Promise<AdminRaidTier> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/raid/tiers/${pct}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.raid.updateTier'))
    }
    return res.json()
  },
}
