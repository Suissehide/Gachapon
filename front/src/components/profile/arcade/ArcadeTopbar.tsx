import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

import { Button } from '../../ui/button'

type Props = {
  isOwnProfile: boolean
  isAdmin: boolean
}

export function ArcadeTopbar({ isOwnProfile, isAdmin }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-mono text-[11px] uppercase tracking-[.15em] opacity-55">
        GACHAPON / PROFIL
      </div>
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
