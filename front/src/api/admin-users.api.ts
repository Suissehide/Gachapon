import { apiUrl } from '../constants/config.constant.ts'
import type { AdminUser, UserStats } from '../constants/user.constant.ts'
import { USER_ROUTES } from '../constants/user.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminUser, UserStats }

export type AdminUsersFilters = {
  search?: string
  status?: 'active' | 'suspended'
  createdFrom?: string
  createdTo?: string
  levelMin?: number
  levelMax?: number
  lastLoginFrom?: string
  lastLoginTo?: string
}

export const AdminUsersApi = {
  getUsers: async (
    params: AdminUsersFilters & { page?: number; limit?: number } = {},
  ): Promise<{
    users: AdminUser[]
    total: number
    page: number
    limit: number
  }> => {
    const { page = 1, limit = 20, ...filters } = params
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== undefined && v !== '',
        ) as [string, string][],
      ),
    })
    const res = await fetchWithAuth(`${apiUrl}${USER_ROUTES.admin.users}?${qs}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération des utilisateurs',
      )
    }
    return res.json()
  },

  exportCsv: async (filters: AdminUsersFilters): Promise<Blob> => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(
        ([, v]) => v !== undefined && v !== '',
      ) as [string, string][],
    )
    const res = await fetchWithAuth(
      `${apiUrl}${USER_ROUTES.admin.usersExport}?${qs}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'export CSV")
    }
    return res.blob()
  },

  getUser: async (
    id: string,
  ): Promise<{ user: AdminUser; stats: UserStats }> => {
    const res = await fetchWithAuth(`${apiUrl}${USER_ROUTES.admin.user(id)}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        "Erreur lors de la récupération de l'utilisateur",
      )
    }
    return res.json()
  },

  updateTokens: async (id: string, amount: number): Promise<unknown> => {
    const res = await fetchWithAuth(
      `${apiUrl}${USER_ROUTES.admin.tokens(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour des tokens')
    }
    return res.json()
  },

  updateDust: async (id: string, amount: number): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}${USER_ROUTES.admin.dust(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour de la poussière')
    }
    return res.json()
  },

  updateRole: async (
    id: string,
    role: 'USER' | 'SUPER_ADMIN',
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}${USER_ROUTES.admin.role(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour du rôle')
    }
    return res.json()
  },

  suspendUser: async (id: string, suspended: boolean): Promise<unknown> => {
    const res = await fetchWithAuth(
      `${apiUrl}${USER_ROUTES.admin.suspend(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour de la suspension')
    }
    return res.json()
  },
}
