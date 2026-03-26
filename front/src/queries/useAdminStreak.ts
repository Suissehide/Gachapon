import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminStreakApi } from '../api/admin-streak.api.ts'

export type { AdminStreakConfig, AdminMilestone } from '../api/admin-streak.api.ts'

const QK = ['admin', 'streak'] as const

export function useAdminStreak() {
  return useQuery({ queryKey: QK, queryFn: () => AdminStreakApi.getConfig() })
}

export function useAdminPatchStreakDefault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof AdminStreakApi.patchDefault>[0]) =>
      AdminStreakApi.patchDefault(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useAdminCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof AdminStreakApi.createMilestone>[0]) =>
      AdminStreakApi.createMilestone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useAdminPatchMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof AdminStreakApi.patchMilestone>[1] }) =>
      AdminStreakApi.patchMilestone(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useAdminDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminStreakApi.deleteMilestone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
