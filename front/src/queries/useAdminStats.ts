import { useQuery } from '@tanstack/react-query'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/dashboard`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      return res.json() as Promise<{
        kpis: { totalUsers: number; pullsToday: number; dustGenerated: number; legendaryCount: number }
        pullsSeries: { day: string; count: number }[]
      }>
    },
    refetchInterval: 60_000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/stats`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<{
        rarityDistribution: { rarity: string; count: number }[]
        topCards: { cardId: string; name: string; rarity: string; count: number }[]
        topUsers: { userId: string; username: string; count: number }[]
      }>
    },
  })
}
