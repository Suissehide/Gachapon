import { apiUrl } from '../constants/config.constant.ts'
import type {
  AdminMilestone,
  AdminStreakConfig,
  StreakReward,
} from '../constants/streak.constant.ts'
import { STREAK_ROUTES } from '../constants/streak.constant.ts'
import i18n from '../i18n/index.ts'
import {
  handleHttpError,
  handleHttpErrorFromServer,
} from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminMilestone, AdminStreakConfig }

// Partial reward payload: any field may be omitted (PATCH semantics).
// `cardRarity: null` clears the card reward; omitted = leave unchanged.
export type RewardPatch = Partial<StreakReward>

export type CreateMilestoneInput = RewardPatch & {
  day: number
}

export const AdminStreakApi = {
  getConfig: async (): Promise<AdminStreakConfig> => {
    const response = await fetchWithAuth(`${apiUrl}${STREAK_ROUTES.admin.root}`)
    if (!response.ok) {
      handleHttpError(response, {}, i18n.t('admin:apiTitles.streak.loadConfig'))
    }
    return response.json()
  },

  patchDefault: async (data: RewardPatch) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.default}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        i18n.t('admin:apiTitles.streak.updateDefaultReward'),
      )
    }
    return response.json()
  },

  createMilestone: async (data: CreateMilestoneInput) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestones}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      // 409 : `streak.milestoneAlreadyExistsForDay` côté back, qui nomme le
      // jour en cause — le message du serveur en dit plus que la copie
      // française qui vivait ici.
      await handleHttpErrorFromServer(
        response,
        { 409: i18n.t('admin:apiTitles.streak.milestoneAlreadyExists') },
        i18n.t('admin:apiTitles.streak.createMilestone'),
      )
    }
    return response.json()
  },

  patchMilestone: async (id: string, data: RewardPatch) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestone(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        i18n.t('admin:apiTitles.streak.updateMilestone'),
      )
    }
    return response.json()
  },

  deleteMilestone: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestone(id)}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        i18n.t('admin:apiTitles.streak.deleteMilestone'),
      )
    }
  },
}
