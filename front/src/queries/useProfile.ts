import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ProfileApi } from '../api/profile.api.ts'

export type { ApiKey, ApiKeyCreated, UserProfile } from '../api/profile.api.ts'

export const useUserProfile = (username: string) =>
  useQuery({
    queryKey: ['profile', username],
    queryFn: () => ProfileApi.getUserProfile(username),
    enabled: !!username,
  })

export const useApiKeys = () =>
  useQuery({
    queryKey: ['api-keys'],
    queryFn: () => ProfileApi.getApiKeys(),
  })

export const useCreateApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => ProfileApi.createApiKey(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export const useDeleteApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ProfileApi.deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}
