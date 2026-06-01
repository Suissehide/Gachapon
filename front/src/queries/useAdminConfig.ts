import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminConfigApi } from '../api/admin-config.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { AdminConfig } from '../api/admin-config.api.ts'

export function useAdminConfig() {
  const query = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => AdminConfigApi.getConfig(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminSaveConfig() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (updates: Parameters<typeof AdminConfigApi.saveConfig>[0]) =>
      AdminConfigApi.saveConfig(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la sauvegarde',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
