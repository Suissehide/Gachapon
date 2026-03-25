import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { TeamsApi } from '../api/teams.api.ts'
import type { TeamRankingPage } from '../api/teams.api.ts'

export type {
  Invitation,
  Team,
  TeamMember,
  TeamSummary,
} from '../api/teams.api.ts'

export const useMyTeams = () =>
  useQuery({
    queryKey: ['teams'],
    queryFn: () => TeamsApi.getMyTeams(),
  })

export const useTeam = (teamId: string | undefined) =>
  useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => TeamsApi.getTeam(teamId ?? ''),
    enabled: !!teamId,
  })

export const useCreateTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      TeamsApi.createTeam(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useUpdateTeam = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      TeamsApi.updateTeam(teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => TeamsApi.deleteTeam(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useInviteMember = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      TeamsApi.inviteMember(teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export const useRemoveMember = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => TeamsApi.removeMember(teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export const useLeaveTeam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => TeamsApi.leaveTeam(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useInvitation = (token: string | undefined) =>
  useQuery({
    queryKey: ['invitation', token],
    queryFn: () => TeamsApi.getInvitation(token ?? ''),
    enabled: !!token,
  })

export const useAcceptInvitation = () =>
  useMutation({
    mutationFn: (token: string) => TeamsApi.acceptInvitation(token),
  })

export const useDeclineInvitation = () =>
  useMutation({
    mutationFn: (token: string) => TeamsApi.declineInvitation(token),
  })

export const useTeamRanking = (teamId: string) =>
  useInfiniteQuery({
    queryKey: ['teamRanking', teamId],
    queryFn: ({ pageParam }) => TeamsApi.getTeamRanking(teamId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage: TeamRankingPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!teamId,
  })
