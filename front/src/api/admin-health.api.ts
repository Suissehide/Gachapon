import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type ServiceHealth = {
  status: 'ok' | 'degraded' | 'down'
  latencyMs: number
}

export type AdminHealth = {
  services: {
    postgres: ServiceHealth
    redis: ServiceHealth
    storage: ServiceHealth
  }
  ws: { connections: number }
  process: { uptimeSeconds: number; memory: { rss: number; heapUsed: number } }
}

export const AdminHealthApi = {
  getHealth: async (): Promise<AdminHealth> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/health`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération de la santé système',
      )
    }
    return res.json()
  },
}
