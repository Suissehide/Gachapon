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
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { TeamDirectoryCard } from '../../../components/team/recruitment/TeamDirectoryCard.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { Input } from '../../../components/ui/input.tsx'
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

      {isPending ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : teams.length === 0 ? (
        <p className="text-center text-sm text-text-light">
          Aucune équipe ne recrute pour l’instant.
        </p>
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
