import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type AdminShopItem = {
  id: string; name: string; description: string; type: string
  dustCost: number; value: unknown; isActive: boolean; createdAt: string
}

export function useAdminShopItems() {
  return useQuery({
    queryKey: ['admin', 'shop-items'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/shop-items`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch shop items')
      return res.json() as Promise<{ items: AdminShopItem[] }>
    },
  })
}

export function useAdminCreateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<AdminShopItem, 'id' | 'createdAt'>) => {
      const res = await fetch(`${API_URL}/admin/shop-items`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create shop item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminUpdateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AdminShopItem> & { id: string }) => {
      const res = await fetch(`${API_URL}/admin/shop-items/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update shop item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminDeleteShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/shop-items/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete shop item')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}
