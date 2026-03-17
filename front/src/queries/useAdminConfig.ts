import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminConfigApi } from '../api/admin-config.api.ts'

export type { AdminConfig } from '../api/admin-config.api.ts'

export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => AdminConfigApi.getConfig(),
  })
}

export function useAdminSaveConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Parameters<typeof AdminConfigApi.saveConfig>[0]) =>
      AdminConfigApi.saveConfig(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config'] }),
  })
}
