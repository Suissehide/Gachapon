import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminMediaApi, type MediaItem } from '../api/admin-media.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { MediaItem } from '../api/admin-media.api.ts'

export const MEDIA_QUERY_KEY = ['admin', 'media'] as const

export function useAdminMedia() {
  const query = useQuery({
    queryKey: MEDIA_QUERY_KEY,
    queryFn: () => AdminMediaApi.getMedia(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useUploadMedia() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (files: File[]) => AdminMediaApi.uploadMedia(files),
    onSuccess: (data) => {
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) => [
        ...data.created,
        ...(prev ?? []),
      ])
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'upload",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (keys: string[]) => AdminMediaApi.deleteMedia(keys),
    onSuccess: ({ deleted }) => {
      qc.setQueryData<MediaItem[]>(MEDIA_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => !deleted.includes(item.key)),
      )
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useRenameMedia() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ from, newName }: { from: string; newName: string }) =>
      AdminMediaApi.renameMedia(from, newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors du renommage',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
