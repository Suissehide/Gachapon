import { useQuery } from '@tanstack/react-query'

import { TeamsApi } from '../api/teams.api.ts'
import type { DuelView } from '../api/wagers.api.ts'
import { TEAM_SLOTS } from '../constants/teams.constant.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useWagers, useWagersLive } from './useWagers.ts'

/**
 * Plafond d'équipes par joueur côté serveur (`MAX_TEAMS_PER_USER`,
 * team.domain.ts). Il borne le nombre d'emplacements `useWagers` ci-dessous :
 * les règles des hooks interdisent une boucle, donc les emplacements sont
 * fixes et ceux sans équipe restent désactivés — aucune requête émise.
 */

/**
 * Le duel en cours du joueur, vu depuis une page qui n'est pas celle de son
 * équipe (Tirage, Collection).
 *
 * Pourquoi passer par les équipes : `GET /teams/:id/wagers` est la seule
 * route qui expose les duels, et un joueur peut appartenir à trois équipes.
 * Le serveur n'autorise qu'un duel ouvert par joueur (`findOpenDuelForUser`
 * dans `DuelDomain#propose`), donc au plus une de ces vues sonde vraiment —
 * `useWagers` ne déclenche son intervalle que si un duel y est ACTIVE.
 *
 * `engagedCardIds` est calculé par le serveur sur TOUS les duels ACTIVE du
 * joueur, pas seulement ceux de l'équipe interrogée : n'importe laquelle des
 * vues suffit donc à connaître les cartes verrouillées.
 */
export function useMyDuel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  // Même clé que `useMyTeams` : la liste est partagée avec la page Équipes
  // plutôt que refetchée. `useDataFetching` n'est volontairement pas branché
  // ici — ce hook vit sur des pages dont le duel n'est pas le sujet, il ne
  // doit ni allumer le loader global ni notifier une erreur.
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => TeamsApi.getMyTeams(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const ids = (teams?.teams ?? []).slice(0, TEAM_SLOTS).map((t) => t.id)
  const slots = [useWagers(ids[0]), useWagers(ids[1]), useWagers(ids[2])]

  // Abonnement WS sur les trois emplacements et pas seulement sur celui qui
  // porte le duel : au règlement, le duel quitte `duels`, et si l'écoute
  // suivait ce duel elle se couperait juste avant l'événement à afficher.
  useWagersLive(ids[0])
  useWagersLive(ids[1])
  useWagersLive(ids[2])

  const isMyActive = (d: DuelView) =>
    d.status === 'ACTIVE' && d.myRole !== 'SPECTATOR'

  const index = slots.findIndex((slot) => slot.data?.duels.some(isMyActive))
  const duel: DuelView | null =
    index === -1 ? null : (slots[index]?.data?.duels.find(isMyActive) ?? null)

  const engagedCardIds = new Set<string>()
  const settledDuels: DuelView[] = []
  for (const slot of slots) {
    for (const id of slot.data?.engagedCardIds ?? []) {
      engagedCardIds.add(id)
    }
    settledDuels.push(...(slot.data?.settledDuels ?? []))
  }

  return {
    duel,
    teamId: index === -1 ? undefined : ids[index],
    teamIds: ids,
    engagedCardIds,
    settledDuels,
  }
}
