import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Crown, Send, Shield, User, UserMinus } from 'lucide-react'
import { useState } from 'react'

import type { TeamMember } from '../../../queries/useTeams.ts'
import {
  useDeleteTeam,
  useInviteMember,
  useRemoveMember,
  useTeam,
} from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/teams/$id')({
  component: TeamDetailPage,
})

const ROLE_ICON: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  ADMIN: <Shield className="h-3.5 w-3.5 text-accent" />,
  MEMBER: <User className="h-3.5 w-3.5 text-text-light" />,
}

function TeamDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: team, isLoading, isError } = useTeam(id)
  const { mutate: invite, isPending: inviting } = useInviteMember(id)
  const { mutate: remove } = useRemoveMember(id)
  const { mutate: deleteTeam } = useDeleteTeam()

  const [inviteInput, setInviteInput] = useState('')
  const [inviteError, setInviteError] = useState('')

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

  const myMember = team.members.find((m) => m.userId === user?.id)
  const isOwner = team.ownerId === user?.id
  const canManage = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN'

  const handleInvite = () => {
    const input = inviteInput.trim()
    if (!input) {
      return
    }
    setInviteError('')
    const isEmail = input.includes('@')
    invite(isEmail ? { email: input } : { username: input }, {
      onSuccess: () => setInviteInput(''),
      onError: (err) => setInviteError(err.message),
    })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/teams"
          className="mb-6 flex items-center gap-1.5 text-sm text-text-light transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes équipes
        </Link>

        {/* Header équipe */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 text-xl font-black text-primary">
            {team.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-text">{team.name}</h1>
            {team.description && (
              <p className="text-sm text-text-light">{team.description}</p>
            )}
            <p className="text-xs text-text-light">
              {team.members.length} membre
              {team.members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Invitation */}
        {canManage && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-text">
              Inviter un membre
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value)
                  if (inviteError) {
                    setInviteError('')
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite()
                  }
                }}
                placeholder="@pseudo ou email"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Inviter
              </button>
            </div>
            {inviteError && (
              <p className="mt-2 text-xs text-destructive">{inviteError}</p>
            )}
          </div>
        )}

        {/* Liste membres */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Membres</h2>
          <ul className="space-y-2">
            {team.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                isOwner={isOwner}
                isMe={member.userId === user?.id}
                onRemove={() => {
                  if (
                    window.confirm(
                      `Exclure @${member.user.username} de l'équipe ?`,
                    )
                  ) {
                    remove(member.userId)
                  }
                }}
              />
            ))}
          </ul>
        </div>

        {/* Danger zone (owner) */}
        {isOwner && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="mb-3 text-sm font-bold text-destructive">
              Zone dangereuse
            </h2>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Supprimer cette équipe définitivement ?')) {
                  deleteTeam(id, {
                    onSuccess: () => navigate({ to: '/teams' }),
                  })
                }
              }}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Supprimer l'équipe
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({
  member,
  canManage,
  isOwner,
  isMe,
  onRemove,
}: {
  member: TeamMember
  canManage: boolean
  isOwner: boolean
  isMe: boolean
  onRemove: () => void
}) {
  const canRemove =
    !isMe &&
    canManage &&
    member.role !== 'OWNER' &&
    (isOwner || member.role === 'MEMBER')

  return (
    <li className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-xs font-bold text-primary">
        {member.user.username[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-text">
          @{member.user.username}
          {isMe && <span className="ml-1 text-xs text-text-light">(moi)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-light">
        {ROLE_ICON[member.role]}
        {member.role.toLowerCase()}
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1.5 text-text-light transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Exclure"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
    </li>
  )
}
