import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ProfileApi } from '../api/profile.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { ApiKey, ApiKeyCreated, UserProfile } from '../api/profile.api.ts'

export const useUserProfile = (username: string) => {
  const query = useQuery({
    queryKey: ['profile', username],
    queryFn: () => ProfileApi.getUserProfile(username),
    enabled: !!username,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useApiKeys = () => {
  const query = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => ProfileApi.getApiKeys(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCreateApiKey = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (name: string) => ProfileApi.createApiKey(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast({
        title: 'Clé API créée',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeleteApiKey = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => ProfileApi.deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
