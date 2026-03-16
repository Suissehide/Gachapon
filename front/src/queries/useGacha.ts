import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export type PullResult = {
  card: {
    id: string
    name: string
    imageUrl: string
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
    variant: 'BRILLIANT' | 'HOLOGRAPHIC' | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

export type TokenBalance = {
  tokens: number
  maxStock: number
  nextTokenAt: string | null
}

export const useTokenBalance = () =>
  useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => api.get<TokenBalance>('/tokens/balance'),
    refetchInterval: 60_000, // rafraîchir toutes les minutes
  })

export const usePull = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<PullResult>('/pulls'),
    onSuccess: () => {
      // Invalider le solde de tokens après un tirage
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export type PullHistory = {
  pulls: Array<{
    id: string
    pulledAt: string
    wasDuplicate: boolean
    dustEarned: number
    card: { id: string; name: string; imageUrl: string; rarity: string; variant: string | null }
  }>
  total: number
  page: number
  limit: number
}

export const usePullHistory = (page = 1) =>
  useQuery({
    queryKey: ['pulls', 'history', page],
    queryFn: () => api.get<PullHistory>(`/pulls/history?page=${page}`),
  })
