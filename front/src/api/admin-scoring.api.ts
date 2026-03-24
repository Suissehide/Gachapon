import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type ScoringConfig = {
  commonPoints: number
  uncommonPoints: number
  rarePoints: number
  epicPoints: number
  legendaryPoints: number
  brilliantMultiplier: number
  holographicMultiplier: number
}

export const AdminScoringApi = {
  getConfig: async (): Promise<ScoringConfig> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/scoring-config`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération de la config de scoring')
    }
    return res.json()
  },

  updateConfig: async (data: ScoringConfig): Promise<ScoringConfig> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/scoring-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour de la config de scoring')
    }
    return res.json()
  },
}
