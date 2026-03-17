import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type AdminConfig = {
  tokenRegenIntervalHours: number; tokenMaxStock: number; pityThreshold: number
  dustCommon: number; dustUncommon: number; dustRare: number; dustEpic: number; dustLegendary: number
}

export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/config`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json() as Promise<AdminConfig>
    },
  })
}

export function useAdminSaveConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<AdminConfig>) => {
      const res = await fetch(`${API_URL}/admin/config`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save config')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'config'] }),
  })
}
