import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminUsersApi } from '../api/admin-users.api.ts'

export type { AdminUser, UserStats } from '../api/admin-users.api.ts'

export function useAdminUsers(
  params: { page?: number; limit?: number; search?: string } = {},
) {
  const { page = 1, limit = 20, search } = params
  return useQuery({
    queryKey: ['admin', 'users', page, limit, search],
    queryFn: () => AdminUsersApi.getUsers({ page, limit, search }),
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => AdminUsersApi.getUser(id),
    enabled: !!id,
  })
}

export function useAdminUpdateTokens() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      AdminUsersApi.updateTokens(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateDust() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      AdminUsersApi.updateDust(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'SUPER_ADMIN' }) =>
      AdminUsersApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminSuspendUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      AdminUsersApi.suspendUser(id, suspended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
