// Annuaire des équipes recrutantes — deuxième point d'entrée de la page
// « Mes équipes » (bouton d'en-tête + tuile d'emplacement libre y menaient
// déjà avant que cet écran n'existe).
//
// `useTeamDirectory` est une `useInfiniteQuery` : une page peut compter
// moins de 20 lignes sans être la dernière (le filtre « équipe complète »
// s'applique après la découpe de la page côté serveur). « Charger plus »
// doit donc se piloter sur `hasNextPage`, jamais sur le nombre de lignes
// déjà rendues.
import { createFileRoute } from '@tanstack/react-router'
import { Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup } from '../../../components/team/CreateTeamPopup.tsx'
import { TeamDirectoryCard } from '../../../components/team/recruitment/TeamDirectoryCard.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { Input } from '../../../components/ui/input.tsx'
import { PopupTrigger } from '../../../components/ui/popup.tsx'
import {
  useApplyToTeam,
  useCancelJoinRequest,
  useTeamDirectory,
} from '../../../queries/useRecruitment.ts'

export const Route = createFileRoute('/_authenticated/team/join')({
  component: TeamJoinPage,
})

function TeamJoinPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounce 300 ms : on ne veut pas une requête par frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTeamDirectory(search)
  const {
    mutate: apply,
    isPending: isApplying,
    variables: applyingId,
  } = useApplyToTeam()
  const {
    mutate: cancel,
    isPending: isCancelling,
    variables: cancellingId,
  } = useCancelJoinRequest()

  const teams = data?.pages.flatMap((page) => page.teams) ?? []
  // Le filtre « équipe complète » s'applique côté serveur APRÈS la découpe
  // de la page : une page de 20 lignes peut donc arriver ici totalement
  // vide sans être la dernière. Sans cet effet, une telle page ferait
  // afficher le vide « Aucune équipe ne recrute pour l'instant » alors que
  // d'autres pages restent à charger — un vrai cul-de-sac pour le joueur.
  useEffect(() => {
    if (
      !isPending &&
      teams.length === 0 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage()
    }
  }, [isPending, teams.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipes', to: '/team' },
          { label: 'Rejoindre' },
        ]}
        title="Rejoindre une équipe"
      />

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light/50" />
        <Input
          placeholder="Rechercher une équipe…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {isPending || (teams.length === 0 && hasNextPage) ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-text-light">
            Aucune équipe ne recrute pour l’instant.
          </p>
          <CreateTeamPopup
            trigger={
              <PopupTrigger variant="default" className="gap-2">
                <Users className="h-4 w-4" />
                Créer une équipe
              </PopupTrigger>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <TeamDirectoryCard
              key={team.id}
              team={team}
              onApply={apply}
              onCancel={cancel}
              isApplyPending={isApplying && applyingId === team.id}
              isCancelPending={isCancelling && cancellingId === team.id}
            />
          ))}
          {hasNextPage && (
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="self-center"
            >
              {isFetchingNextPage ? 'Chargement…' : 'Charger plus'}
            </Button>
          )}
        </div>
      )}
    </PageShell>
  )
}
