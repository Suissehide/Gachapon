import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type EquipmentSlot = 'WEAPON' | 'ARMOR' | 'ACCESSORY'
export type EquipmentRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type EquipmentInstance = {
  id: string
  equipmentId: string
  name: string
  slot: EquipmentSlot
  rarity: EquipmentRarity
  imageUrl: string | null
  bonuses: Record<string, number>
  equippedOnId: string | null
  equippedOnCardName: string | null
  obtainedAt: string
}

export const EquipmentApi = {
  list: async (): Promise<{ items: EquipmentInstance[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/equipment`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement de l\'équipement')
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
      handleHttpError(res, {}, 'Erreur lors de l\'équipement')
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
}
