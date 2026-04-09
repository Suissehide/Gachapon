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
  MyInvitation,
  Team,
  TeamInvitation,
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
    retry: false,
  })

export const useMyInvitations = (enabled = true) =>
  useQuery({
    queryKey: ['invitations', 'me'],
    queryFn: () => TeamsApi.getMyInvitations(),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

export const useAcceptInvitation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.acceptInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invitations', 'me'] })
      void qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export const useDeclineInvitation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.declineInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invitations', 'me'] })
    },
  })
}

export const useTeamRanking = (teamId: string) =>
  useInfiniteQuery({
    queryKey: ['teamRanking', teamId],
    queryFn: ({ pageParam }) => TeamsApi.getTeamRanking(teamId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage: TeamRankingPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: !!teamId,
  })

export const useTeamInvitations = (teamId: string | undefined) =>
  useQuery({
    queryKey: ['teams', teamId, 'invitations'],
    queryFn: () => TeamsApi.getTeamInvitations(teamId ?? ''),
    enabled: !!teamId,
  })

export const useResendInvitation = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.resendInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
    retry: 0,
  })
}

export const useUserSearch = (q: string) =>
  useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => TeamsApi.searchUsers(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })

export const useCancelInvitation = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.cancelInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
  })
}

export const useDeleteInvitation = (teamId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => TeamsApi.deleteInvitation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
  })
}
