import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminMediaApi, type MediaItem } from '../api/admin-media.api.ts'

export type { MediaItem } from '../api/admin-media.api.ts'

export const MEDIA_QUERY_KEY = ['admin', 'media'] as const

export function useAdminMedia() {
  return useQuery({
    queryKey: MEDIA_QUERY_KEY,
    queryFn: () => AdminMediaApi.getMedia(),
  })
}

export function useUploadMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => AdminMediaApi.uploadMedia(files),
    onSuccess: (data) => {
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) => [
        ...(data.created as MediaItem[]),
        ...(prev ?? []),
      ])
    },
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (keys: string[]) => AdminMediaApi.deleteMedia(keys),
    onSuccess: ({ deleted }) => {
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => !deleted.includes(item.key)),
      )
    },
  })
}
