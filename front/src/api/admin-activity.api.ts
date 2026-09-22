import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type ActivityEvent = {
  id: string
  type: string
  payload: Record<string, unknown> | null
  createdAt: string
  user: { id: string; username: string } | null
}

export const AdminActivityApi = {
  getActivity: async (params: {
    cursor?: string
    limit?: number
  }): Promise<{ events: ActivityEvent[]; nextCursor: string | null }> => {
    const qs = new URLSearchParams({
      limit: String(params.limit ?? 30),
      ...(params.cursor ? { cursor: params.cursor } : {}),
    })
    const res = await fetchWithAuth(`${apiUrl}/admin/activity?${qs}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.activity.loadActivity'))
    }
    return res.json()
  },
}
