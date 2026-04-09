import type { ColumnDef } from '@tanstack/react-table'
import { RefreshCw, Send, Trash2, UserPlus, X } from 'lucide-react'
import { type SyntheticEvent, useMemo, useRef, useState } from 'react'

import type { TeamInvitation } from '../../queries/useTeams.ts'
import {
  useCancelInvitation,
  useDeleteInvitation,
  useInviteMember,
  useResendInvitation,
  useTeamInvitations,
  useUserSearch,
} from '../../queries/useTeams.ts'
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

type SelectedTarget =
  | { type: 'username'; value: string }
  | { type: 'email'; value: string }

export function InviteMemberPopup({ teamId, userRole }: Props) {
  const { mutateAsync: invite, isPending } = useInviteMember(teamId)
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
  const [selected, setSelected] = useState<SelectedTarget[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [activeIndex, setActiveIndex] = useState(-1)

  const isEmailMode = identifier.includes('@')
  const { data: searchData } = useUserSearch(
    isEmailMode ? '' : identifier.trim(),
  )
  const searchResults = (searchData?.users ?? []).slice(0, 5)

  const isAlreadySelected = (target: SelectedTarget) =>
    selected.some(
      (s) => s.type === target.type && s.value === target.value,
    )

  const addTarget = (target: SelectedTarget) => {
    setError('')
    if (isAlreadySelected(target)) {
      return
    }
    setSelected((prev) => [...prev, target])
  }

  const removeTarget = (target: SelectedTarget) => {
    setSelected((prev) =>
      prev.filter((s) => !(s.type === target.type && s.value === target.value)),
    )
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    // If user typed something but didn't add it as a chip, try to add it.
    const pending = identifier.trim()
    const targets: SelectedTarget[] = [...selected]
    if (pending) {
      const target: SelectedTarget = pending.includes('@')
        ? { type: 'email', value: pending }
        : { type: 'username', value: pending }
      if (
        !targets.some((t) => t.type === target.type && t.value === target.value)
      ) {
        targets.push(target)
      }
    }

    if (targets.length === 0) {
      return
    }

    setError('')
    setShowDropdown(false)

    const errors: string[] = []
    for (const target of targets) {
      try {
        await invite(
          target.type === 'email'
            ? { email: target.value }
            : { username: target.value },
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur'
        errors.push(`${target.value}: ${message}`)
      }
    }

    if (errors.length === targets.length) {
      setError(errors.join(' • '))
      return
    }

    setSelected(
      errors.length > 0
        ? targets.filter((t) => errors.some((e) => e.startsWith(`${t.value}:`)))
        : [],
    )
    setIdentifier('')
    if (errors.length > 0) {
      setError(errors.join(' • '))
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setIdentifier('')
      setError('')
      setShowDropdown(false)
      setActiveIndex(-1)
      setSelected([])
    }
    setOpen(value)
  }

  const handleSelectUser = (username: string) => {
    addTarget({ type: 'username', value: username })
    setShowDropdown(false)
    setIdentifier('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleAddCurrentInput = () => {
    const trimmed = identifier.trim()
    if (!trimmed) {
      return
    }
    addTarget(
      trimmed.includes('@')
        ? { type: 'email', value: trimmed }
        : { type: 'username', value: trimmed },
    )
    setIdentifier('')
    setActiveIndex(-1)
    setShowDropdown(false)
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
            ? `${row.invitedUsername}`
            : (row.invitedEmail ?? '—'),
        cell: ({ getValue }) => (
          <span className="text-text">{getValue<string>()}</span>
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
                  size="icon"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => cancel(inv.token)}
                >
                  <Trash2 className="h-3 w-3" />
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
        <form onSubmit={(e) => void handleSubmit(e)}>
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
                  autoComplete="off"
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    setActiveIndex(-1)
                    setShowDropdown(
                      !e.target.value.includes('@') &&
                        e.target.value.trim().length >= 2,
                    )
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Backspace' &&
                      identifier === '' &&
                      selected.length > 0
                    ) {
                      e.preventDefault()
                      setSelected((prev) => prev.slice(0, -1))
                      return
                    }
                    if (showDropdown && searchResults.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActiveIndex((i) =>
                          Math.min(i + 1, searchResults.length - 1),
                        )
                        return
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActiveIndex((i) => Math.max(i - 1, 0))
                        return
                      }
                      if (e.key === 'Enter' && activeIndex >= 0) {
                        e.preventDefault()
                        handleSelectUser(searchResults[activeIndex].username)
                        return
                      }
                      if (e.key === 'Escape') {
                        setShowDropdown(false)
                        setActiveIndex(-1)
                        return
                      }
                    }
                    if (e.key === 'Enter' && identifier.trim()) {
                      e.preventDefault()
                      handleAddCurrentInput()
                    }
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setShowDropdown(false)
                      setActiveIndex(-1)
                    }, 150)
                  }
                />
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    {searchResults.map((user, idx) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${idx === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                          onMouseEnter={() => setActiveIndex(idx)}
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
                          <span
                            className={
                              idx === activeIndex ? 'text-primary' : 'text-text'
                            }
                          >
                            {user.username}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((target) => (
                    <span
                      key={`${target.type}:${target.value}`}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {target.type === 'email' ? target.value : `@${target.value}`}
                      <button
                        type="button"
                        aria-label="Retirer"
                        className="rounded-full hover:bg-primary/20"
                        onClick={() => removeTarget(target)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
            <Button
              type="submit"
              disabled={
                isPending ||
                (selected.length === 0 && identifier.trim().length === 0)
              }
            >
              <Send className="h-4 w-4" />
              {isPending
                ? 'Envoi…'
                : selected.length > 1
                  ? `Envoyer ${selected.length} invitations`
                  : "Envoyer l'invitation"}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
