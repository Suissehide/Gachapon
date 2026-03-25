import type { ColumnDef } from '@tanstack/react-table'
import { RefreshCw, Send, Trash2, UserPlus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import {
  useCancelInvitation,
  useDeleteInvitation,
  useInviteMember,
  useResendInvitation,
  useTeamInvitations,
  useUserSearch,
} from '../../queries/useTeams.ts'
import type { TeamInvitation } from '../../queries/useTeams.ts'
import { ReactTable } from '../table/reactTable.tsx'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../ui/popup.tsx'

const RESEND_COOLDOWN_MS = 5 * 60 * 1000

const STATUS_LABELS: Record<TeamInvitation['status'], string> = {
  PENDING: 'Envoyé',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
  ACCEPTED: 'Accepté',
  DECLINED: 'Refusé',
}

const STATUS_CLASSES: Record<TeamInvitation['status'], string> = {
  PENDING: 'bg-blue-500/15 text-blue-400',
  EXPIRED: 'bg-orange-500/15 text-orange-400',
  CANCELLED: 'bg-muted text-text-light',
  ACCEPTED: 'bg-green-500/15 text-green-400',
  DECLINED: 'bg-destructive/15 text-destructive',
}

type Props = {
  teamId: string
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export function InviteMemberPopup({ teamId, userRole }: Props) {
  const { mutate: invite, isPending } = useInviteMember(teamId)
  const { data: invitationsData } = useTeamInvitations(teamId)
  const {
    mutate: resend,
    isPending: isResending,
    variables: resendToken,
  } = useResendInvitation(teamId)
  const { mutate: cancel } = useCancelInvitation(teamId)
  const { mutate: deleteInv } = useDeleteInvitation(teamId)

  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEmailMode = identifier.includes('@')
  const { data: searchData } = useUserSearch(isEmailMode ? '' : identifier.trim())
  const searchResults = searchData?.users ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = identifier.trim()
    if (!trimmed) return
    setError('')
    setShowDropdown(false)
    const isEmail = trimmed.includes('@')
    invite(isEmail ? { email: trimmed } : { username: trimmed }, {
      onSuccess: () => setIdentifier(''),
      onError: (err) => setError(err.message),
    })
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setIdentifier('')
      setError('')
      setShowDropdown(false)
    }
    setOpen(value)
  }

  const handleSelectUser = (username: string) => {
    setShowDropdown(false)
    setIdentifier('')
    setError('')
    invite(
      { username },
      {
        onSuccess: () => setIdentifier(''),
        onError: (err) => setError(err.message),
      },
    )
  }

  const invitations = invitationsData?.invitations ?? []
  const isOwner = userRole === 'OWNER'

  const columns = useMemo<ColumnDef<TeamInvitation>[]>(
    () => [
      {
        id: 'recipient',
        header: 'Destinataire',
        accessorFn: (row) =>
          row.invitedUsername
            ? `@${row.invitedUsername}`
            : (row.invitedEmail ?? '—'),
        cell: ({ getValue }) => (
          <span className="font-medium text-text">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: "Date d'envoi",
        size: 120,
        cell: ({ getValue }) => (
          <span className="text-text-light">
            {new Date(getValue<string>()).toLocaleDateString('fr-FR')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        size: 110,
        cell: ({ getValue }) => {
          const status = getValue<TeamInvitation['status']>()
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
            >
              {STATUS_LABELS[status]}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        size: 200,
        cell: ({ row }) => {
          const inv = row.original
          const emailSent = inv.emailSentAt ? new Date(inv.emailSentAt) : null
          const cooldownActive = emailSent
            ? Date.now() - emailSent.getTime() < RESEND_COOLDOWN_MS
            : false
          const isThisResending = isResending && resendToken === inv.token
          const canResend = inv.status === 'PENDING'
          const canCancel = isOwner && inv.status === 'PENDING'
          const canDelete = isOwner && inv.status !== 'PENDING'
          return (
            <div className="flex items-center justify-end gap-1">
              {canResend && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={cooldownActive || isThisResending}
                  onClick={() => resend(inv.token)}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isThisResending ? 'animate-spin' : ''}`}
                  />
                  {cooldownActive ? 'Patienter' : 'Renvoyer'}
                </Button>
              )}
              {canCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => cancel(inv.token)}
                >
                  <X className="h-3 w-3" />
                  Annuler
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => deleteInv(inv.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [isResending, resendToken, isOwner, resend, cancel, deleteInv],
  )

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      <PopupTrigger variant="outline" size="sm">
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </PopupTrigger>
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle icon={<UserPlus className="h-4 w-4" />}>
            Inviter un membre
          </PopupTitle>
        </PopupHeader>
        <form onSubmit={handleSubmit}>
          <PopupBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-light">
                Entrez le pseudo ou l'adresse e-mail du joueur à inviter.
              </p>
              <div className="relative flex flex-col gap-1">
                <Label htmlFor="invite-identifier">Pseudo ou e-mail</Label>
                <Input
                  ref={inputRef}
                  id="invite-identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    setShowDropdown(
                      !e.target.value.includes('@') &&
                        e.target.value.trim().length >= 2,
                    )
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    {searchResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted text-left"
                          onMouseDown={() => handleSelectUser(user.username)}
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs text-text-light">
                              {user.username[0].toUpperCase()}
                            </span>
                          )}
                          <span className="text-text">@{user.username}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {invitations.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
                  Invitations
                </p>
                <div className="h-[280px] overflow-hidden rounded-lg border border-border">
                  <ReactTable
                    columns={columns}
                    data={invitations}
                    filterId="team-invitations"
                    infiniteScroll={false}
                  />
                </div>
              </div>
            )}
          </PopupBody>
          <PopupFooter>
            <Button type="submit" disabled={isPending}>
              <Send className="h-4 w-4" />
              {isPending ? 'Envoi…' : "Envoyer l'invitation"}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
