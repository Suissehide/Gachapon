import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UpgradesApi, type UpgradeType } from '../api/upgrades.api.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { UpgradeStatus } from '../api/upgrades.api.ts'

export const useUpgrades = () =>
  useQuery({
    queryKey: ['upgrades'],
    queryFn: () => UpgradesApi.getUpgrades(),
  })

export const useBuyUpgrade = () => {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (type: UpgradeType) => UpgradesApi.buyUpgrade(type),
    onSuccess: (result) => {
      if (user) {
        setUser({ ...user, dust: result.newDustTotal })
      }
      qc.invalidateQueries({ queryKey: ['upgrades'] })
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}
