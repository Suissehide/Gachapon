import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'

import { ArcadeCard } from '../../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup, TeamCard } from '../../../components/team/index.ts'
import { useLeaveTeam, useMyTeams } from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/team/')({
  component: TeamsPage,
})

function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useMyTeams()
  const { mutate: leaveTeam } = useLeaveTeam()

  const teams = data?.teams ?? []

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipes' },
        ]}
        title="Mes équipes"
        subtitle={`${teams.length} / 5 équipes`}
        right={teams.length < 5 ? <CreateTeamPopup /> : undefined}
      />

      <ArcadeCard>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : teams.length === 0 ? (
          <div
            className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed"
            style={{ borderColor: 'rgba(27,23,38,.12)' }}
          >
            <Users className="h-10 w-10 text-text-light" />
            <p className="text-text-light">Aucune équipe. Créez-en une !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isOwner={team.ownerId === user?.id}
                onLeave={() => leaveTeam(team.id)}
              />
            ))}
          </div>
        )}
      </ArcadeCard>
    </PageShell>
  )
}
