import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EquipmentApi } from '../api/equipment.api'

const EQUIPMENT_KEY = ['equipment']

export function useEquipmentList() {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: EquipmentApi.list,
  })
}

export function useEquipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userEquipmentId,
      targetUserCardId,
    }: {
      userEquipmentId: string
      targetUserCardId: string
    }) => EquipmentApi.equip(userEquipmentId, targetUserCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat', 'team'] })
    },
  })
}

export function useUnequipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userEquipmentId: string) =>
      EquipmentApi.unequip(userEquipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat', 'team'] })
    },
  })
}
