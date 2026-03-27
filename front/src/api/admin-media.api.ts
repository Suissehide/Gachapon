import { apiUrl } from '../constants/config.constant.ts'
import type {
  MediaItem,
  UploadMediaResult,
} from '../constants/media.constant.ts'
import { MEDIA_ROUTES } from '../constants/media.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { MediaItem, UploadMediaResult }

export const AdminMediaApi = {
  getMedia: async (): Promise<MediaItem[]> => {
    const res = await fetchWithAuth(`${apiUrl}${MEDIA_ROUTES.admin.media}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des médias')
    }
    return res.json()
  },

  uploadMedia: async (files: File[]): Promise<UploadMediaResult> => {
    const form = new FormData()
    for (const file of files) {
      form.append('images[]', file)
    }
    const res = await fetchWithAuth(`${apiUrl}${MEDIA_ROUTES.admin.upload}`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'upload")
    }
    return res.json()
  },

  deleteMedia: async (keys: string[]): Promise<{ deleted: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${MEDIA_ROUTES.admin.media}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression')
    }
    return res.json()
  },

  renameMedia: async (
    from: string,
    newName: string,
  ): Promise<{ key: string; url: string }> => {
    const res = await fetchWithAuth(`${apiUrl}${MEDIA_ROUTES.admin.rename}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, newName }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du renommage')
    }
    return res.json()
  },
}
