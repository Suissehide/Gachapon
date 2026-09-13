// L'annuaire des équipes qui recrutent, en popup depuis « Mes équipes ».
//
// `useTeamDirectory` est une `useInfiniteQuery` : une page peut compter moins
// de 20 lignes sans être la dernière (le filtre « équipe complète » s'applique
// côté serveur APRÈS la découpe de la page). « Charger plus » doit donc se
// piloter sur `hasNextPage`, jamais sur le nombre de lignes déjà rendues.
import { Compass, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import {
  useApplyToTeam,
  useCancelJoinRequest,
  useTeamDirectory,
} from '../../../queries/useRecruitment.ts'
import { Button } from '../../ui/button.tsx'
import { Input } from '../../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../../ui/popup.tsx'
import { TeamDirectoryCard } from './TeamDirectoryCard.tsx'

export function TeamDirectoryPopup({ trigger }: { trigger?: ReactNode } = {}) {
  const [open, setOpen] = useState(false)
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

  // Le filtre « équipe complète » s'applique côté serveur APRÈS la découpe de
  // la page : une page de 20 lignes peut donc arriver ici totalement vide sans
  // être la dernière. Sans cet effet, une telle page ferait afficher le vide
  // « Aucune équipe ne recrute » alors que d'autres pages restent à charger —
  // un vrai cul-de-sac pour le joueur.
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

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setSearchInput('')
      setSearch('')
    }
    setOpen(value)
  }

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      {trigger ?? (
        <PopupTrigger variant="outline" className="gap-2">
          <Compass className="h-4 w-4" />
          Parcourir les équipes
        </PopupTrigger>
      )}
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle icon={<Compass className="h-4 w-4" />}>
            Rejoindre une équipe
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light/50" />
            <Input
              placeholder="Rechercher une équipe…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* La liste défile dans sa propre zone : sinon vingt lignes feraient
              défiler la popup entière et la recherche sortirait de l'écran. */}
          <div className="max-h-[55vh] overflow-y-auto">
            {isPending || (teams.length === 0 && hasNextPage) ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : teams.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-light">
                {/* Deux vides différents : « rien ne correspond » n'est pas
                    « personne ne recrute », et confondre les deux laisse
                    croire à un annuaire désert alors qu'il suffit d'effacer
                    la recherche. */}
                {search
                  ? `Aucune équipe ne correspond à « ${search} ».`
                  : 'Aucune équipe ne recrute pour l’instant.'}
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
          </div>
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}
