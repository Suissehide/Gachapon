import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Settings } from 'lucide-react'

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
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--arcade-surface)] border border-[var(--arcade-border)] font-mono text-[13px] font-semibold hover:-translate-y-px hover:border-[var(--arcade-border-strong)] transition-transform"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <LayoutDashboard size={14} />
              Admin
            </Link>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--arcade-surface)] border border-[var(--arcade-border)] font-mono text-[13px] font-semibold hover:-translate-y-px hover:border-[var(--arcade-border-strong)] transition-transform"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Settings size={14} />
            Paramètres
          </Link>
        </div>
      )}
    </div>
  )
}
