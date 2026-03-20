import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type MediaItem = {
  key: string
  url: string
  size: number
  lastModified: string
  orphan: boolean
  card: {
    id: string
    name: string
    rarity: string
    variant: string | null
  } | null
}

export type UploadMediaResult = {
  created: MediaItem[]
  errors: { filename: string; reason: string }[]
}

export const AdminMediaApi = {
  getMedia: async (): Promise<MediaItem[]> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/media`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération des médias')
    return res.json()
  },

  uploadMedia: async (files: File[]): Promise<UploadMediaResult> => {
    const form = new FormData()
    for (const file of files) {
      form.append('images[]', file)
    }
    const res = await fetchWithAuth(`${apiUrl}/admin/media/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) handleHttpError(res, {}, "Erreur lors de l'upload")
    return res.json()
  },

  deleteMedia: async (keys: string[]): Promise<{ deleted: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/media`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la suppression')
    return res.json()
  },
}
