import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Settings } from 'lucide-react'
import { useState } from 'react'

import { DangerZone } from '../../../components/team'
import { Button } from '../../../components/ui/button.tsx'
import { useAppForm } from '../../../hooks/formConfig.tsx'
import {
  useDeleteTeam,
  useTeam,
  useUpdateTeam,
} from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/team/$id_/settings')({
  component: TeamSettingsPage,
})

function TeamSettingsPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: team, isLoading, isError } = useTeam(id)
  const { mutate: updateTeam, isPending: isUpdating } = useUpdateTeam(id)
  const { mutate: deleteTeam } = useDeleteTeam()
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: team?.name ?? '',
      description: team?.description ?? '',
    },
    onSubmit: ({ value }) => {
      const name = value.name.trim()
      if (!name) return
      setSaveError('')
      setSaved(false)
      updateTeam(
        { name, description: value.description.trim() || undefined },
        {
          onSuccess: () => setSaved(true),
          onError: (err) => setSaveError(err.message),
        },
      )
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !team) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-text-light">Équipe introuvable ou accès refusé.</p>
      </div>
    )
  }

  if (team.ownerId !== user?.id) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-text-light">Accès réservé au propriétaire.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-6 -ml-2 text-text-light hover:text-text"
        >
          <Link to="/team/$id" params={{ id }}>
            <ArrowLeft className="h-4 w-4" />
            {team.name}
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/30 to-secondary/30 text-lg font-black text-primary">
            {team.name[0]?.toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-text-light" />
            <h1 className="text-xl font-black text-text">Réglages</h1>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-bold text-text">
            Informations de l'équipe
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await form.handleSubmit()
            }}
            className="flex flex-col gap-4"
          >
            <form.AppField name="name">
              {(field) => <field.Input label="Nom de l'équipe" />}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.Input label="Description (optionnel)" />
              )}
            </form.AppField>
            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}
            {saved && (
              <p className="text-xs text-green-600">
                Modifications enregistrées.
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>

        <DangerZone
          onDelete={() =>
            deleteTeam(id, {
              onSuccess: () => navigate({ to: '/team' }),
            })
          }
        />
      </div>
    </div>
  )
}
