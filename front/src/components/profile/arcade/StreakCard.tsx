import { ChevronRight, Flame, Trophy } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile } from '../../../api/profile.api'
import { StreakSummaryModal } from '../../streak/StreakSummaryModal'
import { isLoggedInToday, weekDays } from './utils'

type Props = {
  profile: UserProfile
  lastLoginAt?: string | null
  isOwnProfile: boolean
}

export function StreakCard({ profile, lastLoginAt, isOwnProfile }: Props) {
  const [open, setOpen] = useState(false)
  const days = weekDays()
  const todayActive = isLoggedInToday(lastLoginAt ?? null)

  const cardContent = (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Streak de connexion</h3>
        {isOwnProfile && <ChevronRight size={16} className="text-[var(--arcade-text-muted)]" />}
      </div>
      <div className="flex items-end gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Flame size={28} color="#fb923c" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' }} />
            <span className="font-display text-[64px] font-extrabold leading-none">{profile.streakDays}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--arcade-text-muted)]">Jour</div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[var(--arcade-amber-light)]" />
            <span className="font-display text-[36px] font-extrabold leading-none">{profile.bestStreak}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--arcade-text-muted)]">Record</div>
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        {days.map((d) => {
          const active = d.isToday && todayActive
          return (
            <div key={d.dow} className="flex-1 flex flex-col items-center gap-1">
              <span
                className="h-[6px] w-full rounded-full"
                style={{
                  background: active
                    ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                    : 'var(--arcade-surface-2)',
                  boxShadow: active ? '0 0 8px rgba(251, 146, 60, 0.5)' : undefined,
                }}
              />
              <span className="font-mono text-[10px] text-[var(--arcade-text-muted)]">{d.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <>
      {isOwnProfile ? (
        <button
          type="button"
          className="w-full text-left rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6 cursor-pointer hover:border-[var(--arcade-border-strong)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
          onClick={() => setOpen(true)}
        >
          {cardContent}
        </button>
      ) : (
        <div
          className="rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {cardContent}
        </div>
      )}
      {isOwnProfile && <StreakSummaryModal open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
