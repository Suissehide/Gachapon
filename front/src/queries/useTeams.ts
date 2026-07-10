import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { TeamRankingPage } from '../api/teams.api.ts'
import { TeamsApi } from '../api/teams.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type {
  Invitation,
  MyInvitation,
  Team,
  TeamInvitation,
  TeamMember,
  TeamSummary,
} from '../api/teams.api.ts'

export const useMyTeams = () => {
  const query = useQuery({
    queryKey: ['teams'],
    queryFn: () => TeamsApi.getMyTeams(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useTeam = (teamId: string | undefined) => {
  const query = useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => TeamsApi.getTeam(teamId ?? ''),
    enabled: !!teamId,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCreateTeam = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      TeamsApi.createTeam(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      // Creating a team fires a TEAM_JOINED event server-side, which completes
      // the "join_team" quest and mints its (pending) reward. Refresh the quests
      // cache so the completion + claimable badge show without a hard refresh,
      // the pending-rewards list, and fetchMe() so the navbar rewards pastille
      // (user.pendingRewardsCount) updates too.
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      void fetchMe()
      toast({
        title: 'Équipe créée',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la création de l'équipe",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useUpdateTeam = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      TeamsApi.updateTeam(teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast({
        title: 'Équipe mise à jour',
        message: 'Les modifications ont été enregistrées.',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeleteTeam = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (teamId: string) => TeamsApi.deleteTeam(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la suppression de l'équipe",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useInviteMember = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      TeamsApi.inviteMember(teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'invitation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useRemoveMember = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (userId: string) => TeamsApi.removeMember(teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', teamId] })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors du retrait du membre',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useLeaveTeam = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (teamId: string) => TeamsApi.leaveTeam(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors du départ de l'équipe",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useInvitation = (token: string | undefined) => {
  const query = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => TeamsApi.getInvitation(token ?? ''),
    enabled: !!token,
    retry: false,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useMyInvitations = (enabled = true) => {
  const query = useQuery({
    queryKey: ['invitations', 'me'],
    queryFn: () => TeamsApi.getMyInvitations(),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useAcceptInvitation = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: (token: string) => TeamsApi.acceptInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invitations', 'me'] })
      void qc.invalidateQueries({ queryKey: ['teams'] })
      // Accepting an invitation also fires TEAM_JOINED, completing the
      // "join_team" quest and minting its (pending) reward — refresh the quests
      // cache, the pending-rewards list, and fetchMe() for the rewards pastille.
      void qc.invalidateQueries({ queryKey: ['quests'] })
      void qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      void fetchMe()
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'acceptation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeclineInvitation = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.declineInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invitations', 'me'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors du refus de l'invitation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
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

export const useTeamInvitations = (teamId: string | undefined) => {
  const query = useQuery({
    queryKey: ['teams', teamId, 'invitations'],
    queryFn: () => TeamsApi.getTeamInvitations(teamId ?? ''),
    enabled: !!teamId,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useResendInvitation = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.resendInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors du renvoi de l'invitation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
    retry: 0,
  })
}

export const useUserSearch = (q: string) => {
  const query = useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => TeamsApi.searchUsers(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCancelInvitation = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (token: string) => TeamsApi.cancelInvitation(token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'annulation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeleteInvitation = (teamId: string) => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => TeamsApi.deleteInvitation(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teams', teamId, 'invitations'] })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de la suppression de l'invitation",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}
