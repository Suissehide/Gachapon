import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

import { Button } from '../../ui/button'

type Props = {
  isOwnProfile: boolean
  isAdmin: boolean
}

const baseChip =
  'font-mono text-[11px] font-bold uppercase tracking-[0.25em] transition-colors'

export function ArcadeTopbar({ isOwnProfile, isAdmin }: Props) {
  return (
    <div className="flex items-center justify-between">
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
      >
        <Link to="/play" className={`${baseChip} text-text-light/70 hover:text-text`}>
          Gachapon
        </Link>
        <span className={`${baseChip} text-text-light/40`} aria-hidden>
          /
        </span>
        <span className={`${baseChip} text-text-light`} aria-current="page">
          Profil
        </span>
      </nav>
      {isOwnProfile && (
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="pill" size="pill">
              <Link to="/admin">
                <LayoutDashboard size={14} />
                Admin
              </Link>
            </Button>
          )}
          <Button asChild variant="pill" size="pill">
            <Link to="/settings">
              <Settings size={14} />
              Paramètres
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
