import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminUpgradesApi, type UpgradeConfigRow } from '../api/admin-upgrades.api.ts'

export type { UpgradeConfigRow } from '../api/admin-upgrades.api.ts'

export const useAdminUpgrades = () =>
  useQuery({
    queryKey: ['admin', 'upgrades'],
    queryFn: () => AdminUpgradesApi.getUpgrades(),
  })

export const useAdminSaveUpgrades = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (upgrades: UpgradeConfigRow[]) => AdminUpgradesApi.saveUpgrades(upgrades),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'upgrades'] }),
  })
}
