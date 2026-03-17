import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminSets() {
  return useQuery({
    queryKey: ['admin', 'sets'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/sets`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch sets')
      return res.json() as Promise<{ sets: AdminCardSet[] }>
    },
  })
}

export function useAdminCreateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; isActive: boolean }) => {
      const res = await fetch(`${API_URL}/admin/sets`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create set')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminUpdateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; isActive?: boolean }) => {
      const res = await fetch(`${API_URL}/admin/sets/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update set')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminDeleteSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/sets/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete set')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminCards(params: { setId?: string; rarity?: string } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
  return useQuery({
    queryKey: ['admin', 'cards', params],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/cards?${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch cards')
      return res.json() as Promise<{ cards: AdminCard[] }>
    },
  })
}

export function useAdminCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${API_URL}/admin/cards`, {
        method: 'POST', credentials: 'include', body: formData,
      })
      if (!res.ok) throw new Error('Failed to create card')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export function useAdminDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/cards/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete card')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export type AdminCardSet = { id: string; name: string; description?: string; isActive: boolean; createdAt: string; _count: { cards: number } }
export type AdminCard = { id: string; name: string; imageUrl: string; rarity: string; variant?: string; dropWeight: number; set: { id: string; name: string } }
