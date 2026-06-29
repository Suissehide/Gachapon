import { useNavigate } from '@tanstack/react-router'
import { Bell, Check, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { NotificationDot } from './NotificationDot.tsx'

export function InvitationsBadge() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useMyInvitations()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()

  const invitations = data?.invitations ?? []
  const count = invitations.length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleAccept = (token: string, teamId: string) => {
    accept.mutate(token, {
      onSuccess: () => {
        setIsOpen(false)
        void navigate({ to: '/team/$id', params: { id: teamId } })
      },
    })
  }

  const handleDecline = (token: string) => {
    decline.mutate(token)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="h-10 w-10 rounded-[11px] text-text-light/60 hover:bg-text/[0.06] hover:text-text"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <NotificationDot count={count} />

      {isOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-80 overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_64px_-16px_rgba(27,23,38,0.18)]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-light" />
              <span className="font-display text-sm font-bold text-text">
                Notifications
              </span>
              {count > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                  {count}
                </span>
              )}
            </div>
          </div>

          <div className="p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : count === 0 ? (
              <div className="py-6 text-center">
                <Bell className="mx-auto mb-2 h-7 w-7 text-text-light/30" />
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-light">
                  Aucune notification
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {invitations.map((inv) => {
                  const isAccepting =
                    accept.isPending && accept.variables === inv.token
                  const isDeclining =
                    decline.isPending && decline.variables === inv.token
                  const busy = isAccepting || isDeclining
                  const goToTeam = () => {
                    setIsOpen(false)
                    void navigate({
                      to: '/team/$id',
                      params: { id: inv.team.id },
                    })
                  }
                  return (
                    <li
                      key={inv.id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/60"
                    >
                      <button
                        type="button"
                        onClick={goToTeam}
                        title="Voir l'équipe"
                        className="group flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white transition-transform group-hover:scale-105">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-bold text-text transition-colors group-hover:text-primary">
                            {inv.team.name}
                          </p>
                          <p className="truncate text-xs text-text-light">
                            {inv.invitedBy
                              ? `${inv.invitedBy.username} t'invite à rejoindre`
                              : "Tu es invité(e) à rejoindre"}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Accepter"
                          title="Accepter et rejoindre"
                          disabled={busy}
                          onClick={() => handleAccept(inv.token, inv.team.id)}
                          className="h-8 w-8 rounded-full text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50"
                        >
                          {isAccepting ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Refuser"
                          title="Refuser l'invitation"
                          disabled={busy}
                          onClick={() => handleDecline(inv.token)}
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          {isDeclining ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
