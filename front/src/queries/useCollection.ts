import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type CardSet = {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  isActive: boolean
}

export type Card = {
  id: string
  name: string
  imageUrl: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'BRILLIANT' | 'HOLOGRAPHIC' | null
  set: { id: string; name: string }
}

export type UserCard = {
  card: Card
  quantity: number
  obtainedAt: string
}

export const useCardSets = () =>
  useQuery({
    queryKey: ['sets'],
    queryFn: () => api.get<{ sets: CardSet[] }>('/sets'),
  })

export const useCards = (filter?: { setId?: string; rarity?: string }) => {
  const params = new URLSearchParams()
  if (filter?.setId) params.set('setId', filter.setId)
  if (filter?.rarity) params.set('rarity', filter.rarity)
  const qs = params.toString()
  return useQuery({
    queryKey: ['cards', filter],
    queryFn: () => api.get<{ cards: Card[] }>(`/cards${qs ? `?${qs}` : ''}`),
  })
}

export const useUserCollection = (userId: string | undefined) =>
  useQuery({
    queryKey: ['collection', userId],
    queryFn: () => api.get<{ cards: UserCard[] }>(`/users/${userId}/collection`),
    enabled: !!userId,
  })

export const useRecycle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) =>
      api.post<{ dustEarned: number; newDustTotal: number }>('/collection/recycle', { cardId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}
