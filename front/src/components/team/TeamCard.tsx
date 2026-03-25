import { Link } from '@tanstack/react-router'
import { LogOut, X } from 'lucide-react'
import { useState } from 'react'

import type { TeamSummary } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { ConfirmPopup } from './ConfirmPopup.tsx'

export function TeamCard({
  team,
  isOwner,
  onLeave,
}: {
  team: TeamSummary
  isOwner: boolean
  onLeave: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Link
        to="/team/$id"
        params={{ id: team.id }}
        className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 text-sm font-black text-primary transition-all group-hover:from-primary/45 group-hover:to-secondary/45">
          {team.name[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="block truncate font-semibold text-text transition-colors group-hover:text-primary">
            {team.name}
          </p>
          <p className="text-xs text-text-light">
            {team.memberCount} membre{team.memberCount !== 1 ? 's' : ''}
            {isOwner && ' · Propriétaire'}
          </p>
        </div>
        {!isOwner && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setConfirmOpen(true)
            }}
            title="Quitter l'équipe"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Link>

      <ConfirmPopup
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={<LogOut className="h-4 w-4" />}
        title="Quitter l'équipe"
        description={`Êtes-vous sûr de vouloir quitter l'équipe "${team.name}" ?`}
        confirmLabel="Quitter"
        onConfirm={onLeave}
      />
    </>
  )
}
