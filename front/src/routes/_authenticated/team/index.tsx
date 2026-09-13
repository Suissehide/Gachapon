import { createFileRoute, Link } from '@tanstack/react-router'
import { Compass, Users } from 'lucide-react'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup } from '../../../components/team/CreateTeamPopup.tsx'
import { MyJoinRequestsList } from '../../../components/team/recruitment/MyJoinRequestsList.tsx'
import { TeamCard } from '../../../components/team/TeamCard.tsx'
import { Button } from '../../../components/ui/button.tsx'
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
            <Button asChild variant="outline">
              <Link to="/team/join">
                <Compass className="h-4 w-4" />
                Parcourir les équipes
              </Link>
            </Button>
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
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      <MyJoinRequestsList />
    </PageShell>
  )
}
