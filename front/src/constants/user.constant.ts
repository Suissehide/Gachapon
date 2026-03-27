import { toSelectOptions } from '../libs/utils.ts'

export const ROLE = {
  NONE: 'Aucun',
  USER: 'Utilisateur',
  ADMIN: 'Administrateur',
}

export const ROLE_OPTIONS = toSelectOptions(ROLE)

// Types
export type AdminUser = {
  id: string
  username: string
  email: string
  role: string
  tokens: number
  dust: number
  suspended: boolean
  createdAt: string
}

export type UserStats = {
  pullsTotal: number
  dustGenerated: number
  cardsOwned: number
}

// Routes
export const USER_ROUTES = {
  search: (q: string) => `/users/search?q=${encodeURIComponent(q)}`,
  profile: (username: string) => `/users/${username}/profile`,
  collection: (userId: string) => `/users/${userId}/collection`,
  admin: {
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    tokens: (id: string) => `/admin/users/${id}/tokens`,
    dust: (id: string) => `/admin/users/${id}/dust`,
    role: (id: string) => `/admin/users/${id}/role`,
    suspend: (id: string) => `/admin/users/${id}/suspend`,
  },
} as const
