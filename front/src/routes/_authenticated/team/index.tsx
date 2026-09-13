import { createFileRoute } from '@tanstack/react-router'
import { Compass, Users } from 'lucide-react'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup } from '../../../components/team/CreateTeamPopup.tsx'
import { MyJoinRequestsList } from '../../../components/team/recruitment/MyJoinRequestsList.tsx'
import { TeamDirectoryPopup } from '../../../components/team/recruitment/TeamDirectoryPopup.tsx'
import { TeamCard } from '../../../components/team/TeamCard.tsx'
import { EmptyState } from '../../../components/ui/emptyState.tsx'
import { PopupTrigger } from '../../../components/ui/popup.tsx'
import { TEAM_SLOTS } from '../../../constants/teams.constant.ts'
import { useMyTeams } from '../../../queries/useTeams.ts'

export const Route = createFileRoute('/_authenticated/team/')({
  component: TeamsPage,
})

function TeamsPage() {
  const { data, isLoading } = useMyTeams()

  const teams = data?.teams ?? []
  const atCap = teams.length >= TEAM_SLOTS

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: 'Gachapon', to: '/play' }, { label: 'Équipes' }]}
        title="Mes équipes"
        right={
          <div className="flex gap-2">
            <TeamDirectoryPopup
              trigger={
                <PopupTrigger variant="outline" className="gap-2">
                  <Compass className="h-4 w-4" />
                  Parcourir les équipes
                </PopupTrigger>
              }
            />
            <CreateTeamPopup
              trigger={
                <PopupTrigger
                  variant="default"
                  className="gap-2"
                  disabled={atCap}
                  title={
                    atCap
                      ? `Tu as atteint la limite de ${TEAM_SLOTS} équipes par joueur.`
                      : undefined
                  }
                >
                  <Users className="h-4 w-4" />
                  {atCap
                    ? `Limite de ${TEAM_SLOTS} équipes atteinte`
                    : 'Créer une équipe'}
                </PopupTrigger>
              }
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Tu n’es dans aucune équipe"
              action={
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <TeamDirectoryPopup
                    trigger={
                      <PopupTrigger variant="outline" size="sm">
                        <Compass className="h-4 w-4" />
                        Parcourir les équipes
                      </PopupTrigger>
                    }
                  />
                  <CreateTeamPopup
                    trigger={
                      <PopupTrigger variant="default" size="sm">
                        <Users className="h-4 w-4" />
                        Créer une équipe
                      </PopupTrigger>
                    }
                  />
                </div>
              }
            >
              Une équipe partage un raid hebdomadaire, des duels de tirage et
              des bonus qui profitent à tous ses membres. Rejoins-en une, ou
              monte la tienne.
            </EmptyState>
          ) : (
            teams.map((team) => <TeamCard key={team.id} team={team} />)
          )}
        </div>
      )}

      <MyJoinRequestsList />
    </PageShell>
  )
}
