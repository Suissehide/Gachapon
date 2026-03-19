import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'

import { CreateTeamPopup, TeamCard } from '../../../components/team/index.ts'
import { useLeaveTeam, useMyTeams } from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/teams/')({
  component: TeamsPage,
})

function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useMyTeams()
  const { mutate: leaveTeam } = useLeaveTeam()

  const teams = data?.teams ?? []

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Mes Équipes</h1>
            <p className="text-sm text-text-light">
              {teams.length} / 5 équipes
            </p>
          </div>
          {teams.length < 5 && <CreateTeamPopup />}
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
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
      </div>
    </div>
  )
}
