import { RefreshCw, Send, Trash2, UserPlus, X } from 'lucide-react'
import { useRef, useState } from 'react'

import {
  useCancelInvitation,
  useDeleteInvitation,
  useInviteMember,
  useResendInvitation,
  useTeamInvitations,
  useUserSearch,
} from '../../queries/useTeams.ts'
import type { TeamInvitation } from '../../queries/useTeams.ts'
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
  const { mutate: resend, isPending: isResending, variables: resendToken } = useResendInvitation(teamId)
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
    invite({ username }, {
      onSuccess: () => setIdentifier(''),
      onError: (err) => setError(err.message),
    })
  }

  const invitations = invitationsData?.invitations ?? []
  const isOwner = userRole === 'OWNER'

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      <PopupTrigger variant="outline" size="sm">
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </PopupTrigger>
      <PopupContent className="max-w-2xl">
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
                  <ul className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    {searchResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                          onMouseDown={() => handleSelectUser(user.username)}
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs text-text-light">
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
              <div>
                <p className="mb-2 text-xs font-semibold text-text-light uppercase tracking-wide">
                  Invitations
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium text-text-light">
                          Destinataire
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-text-light">
                          Date d'envoi
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-text-light">
                          Statut
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-text-light">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => {
                        const recipient = inv.invitedUsername
                          ? `@${inv.invitedUsername}`
                          : (inv.invitedEmail ?? '—')
                        const emailSent = inv.emailSentAt
                          ? new Date(inv.emailSentAt)
                          : null
                        const cooldownActive = emailSent
                          ? Date.now() - emailSent.getTime() <
                            RESEND_COOLDOWN_MS
                          : false
                        const isThisResending =
                          isResending && resendToken === inv.token
                        const canDelete = isOwner && inv.status !== 'PENDING'
                        const canCancel = isOwner && inv.status === 'PENDING'
                        const canResend = inv.status === 'PENDING'

                        return (
                          <tr
                            key={inv.id}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="px-3 py-2 text-text">{recipient}</td>
                            <td className="px-3 py-2 text-text-light">
                              {new Date(inv.createdAt).toLocaleDateString(
                                'fr-FR',
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[inv.status]}`}
                              >
                                {STATUS_LABELS[inv.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2">
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
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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
