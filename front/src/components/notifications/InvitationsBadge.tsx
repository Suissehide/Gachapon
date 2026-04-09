import { Link } from '@tanstack/react-router'
import { Bell, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useMyInvitations } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'

export function InvitationsBadge() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useMyInvitations()
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

  const displayCount = count > 9 ? '9+' : String(count)

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="text-text-light hover:text-text"
      >
        <Bell className="h-4 w-4" />
      </Button>

      {count > 0 && (
        <div className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] font-bold text-white">
          {displayCount}
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-72 overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-light" />
              <span className="text-sm font-semibold text-text">
                Notifications
              </span>
              {count > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
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
                <p className="text-xs text-text-light">
                  Aucune notification.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {invitations.map((inv) => (
                  <Link
                    key={inv.id}
                    to="/invitations/$token"
                    params={{ token: inv.token }}
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {inv.team.name}
                      </p>
                      <p className="truncate text-xs text-text-light">
                        {inv.invitedBy
                          ? `@${inv.invitedBy.username} t'invite à rejoindre`
                          : "Tu es invité(e) à rejoindre"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
