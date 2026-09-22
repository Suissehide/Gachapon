import i18n from '../i18n/index.ts'
import { toSelectOptions } from '../libs/utils.ts'

// Résolu une fois au chargement du module — sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`).
export const ROLE = {
  NONE: i18n.t('admin:role.NONE'),
  USER: i18n.t('admin:role.USER'),
  ADMIN: i18n.t('admin:role.ADMIN'),
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
  gold: number
  suspended: boolean
  createdAt: string
  level: number
  lastLoginAt: string | null
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
    usersExport: '/admin/users/export',
    user: (id: string) => `/admin/users/${id}`,
    tokens: (id: string) => `/admin/users/${id}/tokens`,
    dust: (id: string) => `/admin/users/${id}/dust`,
    role: (id: string) => `/admin/users/${id}/role`,
    suspend: (id: string) => `/admin/users/${id}/suspend`,
  },
} as const
