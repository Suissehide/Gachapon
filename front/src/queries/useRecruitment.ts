import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { RecruitmentApi } from '../api/recruitment.api.ts'
import type { TeamJoinRequest } from '../constants/teams.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useMyTeams } from './useTeams.ts'

/**
 * `team:join-request` part vers les officiers, `team:join-decision` vers le
 * candidat : l'un annonce une nouvelle ligne dans la file du chef, l'autre
 * une décision dans l'agrégat du candidat. Les deux vivent sous le préfixe
 * `['recruitment']`, donc une seule invalidation couvre l'annuaire, la file
 * du chef ET la liste du candidat — même schéma que `useMyPendingDuels`
 * pour les duels.
 *
 * IMPORTANT : `team:join-decision` porte aussi `status: 'DECLINED'`.
 * Invalider la query est sans risque (elle ne fait que rafraîchir la ligne
 * dans `MyJoinRequestsList`, lue en passant), mais rien ici ne doit se
 * transformer en toast ou en pastille pour un refus — la spec est explicite
 * là-dessus.
 */
function useRecruitmentLiveInvalidation(): void {
  const qc = useQueryClient()
  useEffect(
    () =>
      wsClient.on((event) => {
        if (
          event.type === 'team:join-request' ||
          event.type === 'team:join-decision'
        ) {
          void qc.invalidateQueries({ queryKey: ['recruitment'] })
        }
      }),
    [qc],
  )
}

export type {
  DirectoryTeam,
  MyJoinRequest,
  TeamJoinRequest,
} from '../api/recruitment.api.ts'

export type TeamJoinRequestWithTeam = TeamJoinRequest & {
  teamId: string
  teamName: string
}

// Annuaire des équipes recrutantes. `GET /teams/directory` renvoie une page
// qui peut compter MOINS de 20 entrées sans être la dernière : le filtre
// « équipe complète » s'applique APRÈS la découpe de la page. `useInfiniteQuery`
// avec `getNextPageParam` lu sur `nextCursor` (jamais sur la taille de la
// page) est donc la seule forme qui empêche un consommateur de se tromper —
// même schéma que `useAdminActivity`.
export const useTeamDirectory = (search: string) => {
  const query = useInfiniteQuery({
    queryKey: ['recruitment', 'directory', search],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      RecruitmentApi.getDirectory({ cursor: pageParam, search }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useMyJoinRequests = () => {
  useRecruitmentLiveInvalidation()

  const query = useQuery({
    queryKey: ['recruitment', 'mine'],
    queryFn: () => RecruitmentApi.getMine(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useTeamJoinRequests = (teamId: string | undefined) => {
  const query = useQuery({
    queryKey: ['recruitment', 'team', teamId],
    queryFn: () => RecruitmentApi.getForTeam(teamId ?? ''),
    enabled: !!teamId,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useApplyToTeam = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('team')
  return useMutation({
    mutationFn: (teamId: string) => RecruitmentApi.apply(teamId),
    onSuccess: (request) => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['recruitment'] })
      toast({
        title: t('recruitment.appliedTitle'),
        message: t('recruitment.appliedMessage', { team: request.teamName }),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('recruitment.applyErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useCancelJoinRequest = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('team')
  return useMutation({
    mutationFn: (teamId: string) => RecruitmentApi.cancel(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['recruitment'] })
      toast({
        title: t('recruitment.cancelledTitle'),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('recruitment.cancelErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useAcceptJoinRequest = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('team')
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: (requestId: string) => RecruitmentApi.accept(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['recruitment'] })
      // L'acceptation fait entrer un membre, exactement comme
      // `useCreateTeam` / `useAcceptInvitation` : elle déclenche le même
      // `TEAM_JOINED` côté serveur, donc elle doit rafraîchir les mêmes
      // caches — sinon une quête complétée par candidature n'apparaît
      // jamais, et la pastille de récompenses (qui lit
      // `user.pendingRewardsCount` via `fetchMe`, pas la query) reste figée.
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      void fetchMe()
      toast({
        title: t('recruitment.acceptedTitle'),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('recruitment.acceptErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeclineJoinRequest = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('team')
  return useMutation({
    mutationFn: (requestId: string) => RecruitmentApi.decline(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['recruitment'] })
      toast({
        title: t('recruitment.declinedTitle'),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('recruitment.declineErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

/**
 * L'agrégat que consomme la cloche : toutes les candidatures en attente,
 * toutes équipes confondues, pour les équipes où le joueur est OWNER ou
 * ADMIN. `GET /teams/:id/join-requests` ne renvoie ni l'id ni le nom de
 * l'équipe — on les rajoute ici depuis `useMyTeams()`, seule source qui les
 * porte déjà.
 */
export const useMyTeamsJoinRequests = () => {
  useRecruitmentLiveInvalidation()

  const { data: teamsData, isPending: isTeamsPending } = useMyTeams()

  const officerTeams = (teamsData?.teams ?? []).filter(
    (team) => team.myRole !== 'MEMBER',
  )

  const results = useQueries({
    queries: officerTeams.map((team) => ({
      queryKey: ['recruitment', 'team', team.id],
      queryFn: () => RecruitmentApi.getForTeam(team.id),
    })),
  })

  const isLoading = isTeamsPending || results.some((result) => result.isPending)
  const isError = results.some((result) => result.isError)

  const requests: TeamJoinRequestWithTeam[] = officerTeams.flatMap(
    (team, index) => {
      const data = results[index]?.data
      if (!data) {
        return []
      }
      return data.requests.map((request) => ({
        ...request,
        teamId: team.id,
        teamName: team.name,
      }))
    },
  )

  return { requests, isLoading, isError }
}
