import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'

export type TeamMember = {
  id: string
  userId: string
  role: 'MEMBER' | 'ADMIN' | 'OWNER'
  joinedAt: string
  user: { id: string; username: string; avatar: string | null }
}

export type Team = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: string
  members: TeamMember[]
}

export type TeamSummary = Team & { memberCount: number }

export type Invitation = {
  id: string
  token: string
  teamId: string
  status: string
  expiresAt: string
}

export const useMyTeams = () =>
  useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get<{ teams: TeamSummary[] }>('/teams'),
  })

export const useTeam = (teamId: string | undefined) =>
  useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => api.get<Team>(`/teams/${teamId}`),
    enabled: !!teamId,
  })

export const useCreateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<Team>('/teams', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => api.delete<void>(`/teams/${teamId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useInviteMember = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      api.post<Invitation>(`/teams/${teamId}/invite`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export const useRemoveMember = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<void>(`/teams/${teamId}/members/${userId}/remove`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export const useLeaveTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => api.post<void>(`/teams/${teamId}/leave`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useInvitation = (token: string | undefined) =>
  useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get<Invitation>(`/invitations/${token}`),
    enabled: !!token,
  })

export const useAcceptInvitation = () =>
  useMutation({
    mutationFn: (token: string) =>
      api.post<{ accepted: boolean }>(`/invitations/${token}/accept`),
  })

export const useDeclineInvitation = () =>
  useMutation({
    mutationFn: (token: string) =>
      api.post<{ declined: boolean }>(`/invitations/${token}/decline`),
  })
