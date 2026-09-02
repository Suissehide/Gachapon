import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

// Miroir de EquipmentSlot (prisma/schema.prisma) : étendre ici en même temps que là-bas.
export type EquipmentSlot =
  | 'WEAPON'
  | 'ARMOR'
  | 'RING'
  | 'AMULET'
  | 'GLOVES'
  | 'BOOTS'
  | 'BELT'
export type EquipmentRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
// Miroir de EquipmentSet (prisma/schema.prisma).
export type EquipmentSetKey = 'FUREUR' | 'PRECISION' | 'PERCEE' | 'SANGSUE'

// Miroir de SUBSTAT_KEYS (back/src/main/domain/equipment/equipment-progression.ts) :
// étendre ici en même temps que là-bas.
export type SubstatKey =
  | 'hpFlat'
  | 'hpPct'
  | 'atkFlat'
  | 'atkPct'
  | 'defFlat'
  | 'defPct'
  | 'spdFlat'
  | 'spdPct'
  | 'critRatePct'
  | 'critDmgPct'
  | 'armorPenPct'
  | 'lifestealPct'

export type Substat = { key: SubstatKey; value: number }

export type EquipmentMilestone = {
  type: 'added' | 'improved'
  key: SubstatKey
  rolledValue: number
  newValue: number
}

export type EquipmentInstance = {
  id: string
  equipmentId: string
  name: string
  slot: EquipmentSlot
  rarity: EquipmentRarity
  setKey: EquipmentSetKey
  setLabel: string
  imageUrl: string | null
  bonuses: Record<string, number>
  equippedOnId: string | null
  equippedOnCardName: string | null
  obtainedAt: string
  level: number
  substats: Substat[]
  baseBoost: number
}

export type EquipmentSetTier = {
  label: string
  bonuses: Record<string, number>
}

export type EquipmentSetDefinition = {
  key: EquipmentSetKey
  label: string
  two: EquipmentSetTier
  four: EquipmentSetTier
}

export const EquipmentApi = {
  list: async (): Promise<{ items: EquipmentInstance[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/equipment`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors du chargement de l'équipement")
    }
    return res.json()
  },

  sets: async (): Promise<{ sets: EquipmentSetDefinition[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/equipment/sets`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement des sets')
    }
    return res.json()
  },

  equip: async (
    userEquipmentId: string,
    targetUserCardId: string,
  ): Promise<{ equippedOnId: string; previouslyEquippedId: string | null }> => {
    const res = await fetchWithAuth(
      `${apiUrl}/equipment/${userEquipmentId}/equip`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserCardId }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'équipement")
    }
    return res.json()
  },

  unequip: async (
    userEquipmentId: string,
  ): Promise<{ unequipped: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}/equipment/${userEquipmentId}/unequip`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du déséquipement')
    }
    return res.json()
  },

  upgrade: async (
    userEquipmentId: string,
  ): Promise<{
    level: number
    substats: Substat[]
    baseBoost: number
    goldSpent: number
    newGold: number
    milestone: EquipmentMilestone | null
  }> => {
    const res = await fetchWithAuth(
      `${apiUrl}/equipment/${userEquipmentId}/upgrade`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'amélioration")
    }
    return res.json()
  },

  salvage: async (
    userEquipmentIds: string[],
  ): Promise<{
    goldEarned: number
    newGold: number
    destroyedCount: number
  }> => {
    const res = await fetchWithAuth(`${apiUrl}/equipment/salvage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEquipmentIds }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la destruction')
    }
    return res.json()
  },
}
