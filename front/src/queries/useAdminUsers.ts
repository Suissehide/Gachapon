import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  const { page = 1, limit = 20, search } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) })
  return useQuery({
    queryKey: ['admin', 'users', page, limit, search],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/users?${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: AdminUser[]; total: number; page: number; limit: number }>
    },
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json() as Promise<{ user: AdminUser; stats: UserStats }>
    },
    enabled: !!id,
  })
}

export function useAdminUpdateTokens() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/tokens`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error('Failed to update tokens')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateDust() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/dust`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error('Failed to update dust')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'USER' | 'SUPER_ADMIN' }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/role`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminSuspendUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const res = await fetch(`${API_URL}/admin/users/${id}/suspend`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      })
      if (!res.ok) throw new Error('Failed to update suspend')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export type AdminUser = {
  id: string; username: string; email: string; role: string
  tokens: number; dust: number; suspended: boolean; createdAt: string
}
export type UserStats = { pullsTotal: number; dustGenerated: number; cardsOwned: number }
