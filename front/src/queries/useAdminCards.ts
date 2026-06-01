import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminCardsApi } from '../api/admin-cards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { AdminCard, AdminCardSet } from '../api/admin-cards.api.ts'

export function useAdminSets() {
  const query = useQuery({
    queryKey: ['admin', 'sets'],
    queryFn: () => AdminCardsApi.getSets(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminCreateSet() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      isActive: boolean
    }) => AdminCardsApi.createSet(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création du set',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateSet() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string
      isActive?: boolean
    }) => AdminCardsApi.updateSet(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour du set',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminDeleteSet() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => AdminCardsApi.deleteSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression du set',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminCards(
  params: { setId?: string; rarity?: string } = {},
  options?: { enabled?: boolean },
) {
  const query = useQuery({
    queryKey: ['admin', 'cards', params],
    queryFn: () => AdminCardsApi.getCards(params),
    enabled: options?.enabled ?? true,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminCreateCard() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (formData: FormData) => AdminCardsApi.createCard(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création de la carte',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateCard() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name?: string
      rarity?: string
      dropWeight?: number
      imageUrl?: string | null
    }) => AdminCardsApi.updateCard(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour de la carte',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminDeleteCard() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => AdminCardsApi.deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression de la carte',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateCardImage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      AdminCardsApi.updateCardImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
    onError: (error) => {
      toast({
        title: "Erreur lors de la mise à jour de l'image",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
