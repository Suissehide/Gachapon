import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'

export type UserProfile = {
  id: string
  username: string
  avatar: string | null
  banner: string | null
  level: number
  xp: number
  dust: number
  createdAt: string
  stats: {
    totalPulls: number
    ownedCards: number
    legendaryCount: number
    dustGenerated: number
  }
}

export type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export type ApiKeyCreated = ApiKey & { key: string }

export const useUserProfile = (username: string) =>
  useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get<UserProfile>(`/users/${username}/profile`),
    enabled: !!username,
  })

export const useApiKeys = () =>
  useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/api-keys'),
  })

export const useCreateApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiKeyCreated>('/api-keys', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export const useDeleteApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}
