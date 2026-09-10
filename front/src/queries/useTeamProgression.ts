import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import type { TeamPerkKey } from '../api/teamProgression.api.ts'
import { TeamProgressionApi } from '../api/teamProgression.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'

const MEMBERS_PAGE_SIZE = 10

// Même convention que le reste de `useTeams.ts` : `['teams', teamId]` est
// LA clé de l'équipe, déjà invalidée par les mutations existantes
// (renommage, invitation, exclusion…). GET /teams/:id renvoie désormais
// `teamDetailResponseSchema` — un sur-ensemble de l'ancien `Team` — donc
// partager la clé ne corrompt rien : les deux hooks lisent le même JSON.
export const teamDetailKey = (teamId: string) => ['teams', teamId] as const
export const teamMembersKey = (teamId: string) =>
  ['teams', teamId, 'members'] as const
export const teamRaidHistoryKey = (teamId: string) =>
  ['teams', teamId, 'raids'] as const

export function useTeamDetail(teamId: string | undefined) {
  return useQuery({
    queryKey: teamDetailKey(teamId ?? ''),
    queryFn: () => TeamProgressionApi.getTeamDetail(teamId as string),
    enabled: Boolean(teamId),
  })
}

/**
 * `GET /teams/:id/members` ne prend pas de page/limite côté serveur — il
 * renvoie la table entière, déjà triée par dégâts de raid décroissants
 * (jusqu'à `team.maxMembers`, 35). La pagination est donc un découpage
 * CLIENT sur cette liste unique, pas une requête par page.
 */
export function useTeamMembers(
  teamId: string | undefined,
  page = 1,
  pageSize = MEMBERS_PAGE_SIZE,
) {
  const query = useQuery({
    queryKey: teamMembersKey(teamId ?? ''),
    queryFn: () => TeamProgressionApi.getTeamMembers(teamId as string),
    enabled: Boolean(teamId),
  })

  const all = query.data?.members ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
  const clampedPage = Math.min(Math.max(1, page), totalPages)
  const members = useMemo(() => {
    const start = (clampedPage - 1) * pageSize
    return all.slice(start, start + pageSize)
  }, [all, clampedPage, pageSize])

  return {
    ...query,
    members,
    total: all.length,
    page: clampedPage,
    totalPages,
    weekKey: query.data?.weekKey,
    attacksPerDay: query.data?.attacksPerDay,
  }
}

export function useTeamRaidHistory(teamId: string | undefined) {
  return useQuery({
    queryKey: teamRaidHistoryKey(teamId ?? ''),
    queryFn: () => TeamProgressionApi.getTeamRaidHistory(teamId as string),
    enabled: Boolean(teamId),
  })
}

/**
 * Dépense un point de bonus. Ne touche ni poussière ni jetons — `perkPoints`
 * est une ressource d'ÉQUIPE, distincte du profil du joueur — donc pas
 * d'appel à `fetchMe()` ici, contrairement à `usePlaceBet` par exemple.
 */
export function useSpendPerk(teamId: string) {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (key: TeamPerkKey) => TeamProgressionApi.spendPerk(teamId, key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamDetailKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Investissement impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

/** Remise à zéro des bonus, chef seul. Même remarque sur `fetchMe()`. */
export function useResetPerks(teamId: string) {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: () => TeamProgressionApi.resetPerks(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamDetailKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Réinitialisation impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

/**
 * Un seul abonnement WS pour les deux événements d'équipe : `team:levelup`
 * (niveau/XP/perkPoints) et `team:perk` (rang d'un bonus). Les deux
 * invalident la fiche d'équipe ; `team:perk` invalide aussi la table des
 * membres, parce que le bonus `raid` change `attacksPerDay`/
 * `raidAttacksLeft` de CHAQUE ligne (voir `raidAttacksBonusForTeam` côté
 * back) — pas seulement un affichage isolé du rang.
 *
 * Il n'existe délibérément pas de `team:points` : il faudrait le pousser à
 * chaque tirage de chaque membre pour un total que le refresh de la page
 * couvre déjà.
 */
export function useTeamLive(teamId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!teamId) {
      return
    }
    return wsClient.on((event) => {
      if (event.type !== 'team:levelup' && event.type !== 'team:perk') {
        return
      }
      if (event.teamId !== teamId) {
        return
      }
      qc.invalidateQueries({ queryKey: teamDetailKey(teamId) })
      if (event.type === 'team:perk') {
        qc.invalidateQueries({ queryKey: teamMembersKey(teamId) })
      }
    })
  }, [teamId, qc])
}
