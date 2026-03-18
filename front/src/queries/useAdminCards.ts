import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminCardsApi } from '../api/admin-cards.api.ts'

export type { AdminCard, AdminCardSet } from '../api/admin-cards.api.ts'

export function useAdminSets() {
  return useQuery({
    queryKey: ['admin', 'sets'],
    queryFn: () => AdminCardsApi.getSets(),
  })
}

export function useAdminCreateSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      isActive: boolean
    }) => AdminCardsApi.createSet(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminUpdateSet() {
  const qc = useQueryClient()
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
  })
}

export function useAdminDeleteSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminCardsApi.deleteSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sets'] }),
  })
}

export function useAdminCards(
  params: { setId?: string; rarity?: string } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'cards', params],
    queryFn: () => AdminCardsApi.getCards(params),
    enabled: options?.enabled ?? true,
  })
}

export function useAdminCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => AdminCardsApi.createCard(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export function useAdminUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name?: string
      rarity?: string
      dropWeight?: number
    }) => AdminCardsApi.updateCard(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}

export function useAdminDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminCardsApi.deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cards'] }),
  })
}
