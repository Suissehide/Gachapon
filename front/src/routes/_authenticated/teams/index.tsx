import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Users, X } from 'lucide-react'
import { useState } from 'react'

import type { TeamSummary } from '../../queries/useTeams'
import { useCreateTeam, useLeaveTeam, useMyTeams } from '../../queries/useTeams'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/teams/')({
  component: TeamsPage,
})

function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useMyTeams()
  const { mutate: createTeam, isPending: creating } = useCreateTeam()
  const { mutate: leaveTeam } = useLeaveTeam()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [createError, setCreateError] = useState('')

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) {
      return
    }
    setCreateError('')
    createTeam(
      { name, description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          setShowCreate(false)
          setNewName('')
          setNewDesc('')
          setCreateError('')
        },
        onError: (err) => setCreateError(err.message),
      },
    )
  }

  const teams = data?.teams ?? []

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Mes Équipes</h1>
            <p className="text-sm text-text-light">
              {teams.length} / 5 équipes
            </p>
          </div>
          {teams.length < 5 && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Créer
            </button>
          )}
        </div>

        {/* Modal création */}
        {showCreate && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-card p-5">
            <h2 className="mb-4 text-sm font-bold text-text">
              Nouvelle équipe
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom de l'équipe"
                maxLength={50}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optionnel)"
                maxLength={200}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {createError && (
                <p className="text-xs text-destructive">{createError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-light transition-colors hover:text-text"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

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
                onLeave={() => {
                  if (window.confirm(`Quitter l'équipe "${team.name}" ?`)) {
                    leaveTeam(team.id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamCard({
  team,
  isOwner,
  onLeave,
}: {
  team: TeamSummary
  isOwner: boolean
  onLeave: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 text-sm font-black text-primary">
        {team.name[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to="/teams/$id"
          params={{ id: team.id }}
          className="block truncate font-semibold text-text transition-colors hover:text-primary"
        >
          {team.name}
        </Link>
        <p className="text-xs text-text-light">
          {team.memberCount} membre{team.memberCount !== 1 ? 's' : ''}
          {isOwner && ' · Propriétaire'}
        </p>
      </div>
      {!isOwner && (
        <button
          type="button"
          onClick={onLeave}
          className="rounded p-1.5 text-text-light transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Quitter l'équipe"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
