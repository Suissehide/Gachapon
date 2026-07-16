import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  AdminUsersApi,
  type AdminUsersFilters,
} from '../api/admin-users.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type {
  AdminUser,
  AdminUsersFilters,
  UserStats,
} from '../api/admin-users.api.ts'

export function useAdminUsers(
  params: AdminUsersFilters & { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 20, ...filters } = params
  const query = useQuery({
    queryKey: ['admin', 'users', page, limit, filters],
    queryFn: () => AdminUsersApi.getUsers({ page, limit, ...filters }),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminUser(id: string) {
  const query = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => AdminUsersApi.getUser(id),
    enabled: !!id,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminUpdateTokens() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      AdminUsersApi.updateTokens(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour des tokens',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateDust() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      AdminUsersApi.updateDust(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour de la poussière',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateRole() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'SUPER_ADMIN' }) =>
      AdminUsersApi.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour du rôle',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminSuspendUser() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      AdminUsersApi.suspendUser(id, suspended),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (error) => {
      toast({
        title: "Erreur lors de la suspension de l'utilisateur",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
