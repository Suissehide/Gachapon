import { ChevronRight, Flame, Trophy } from 'lucide-react'
import { useState } from 'react'

import type { UserProfile } from '../../../api/profile.api'
import { StreakSummaryModal } from '../../streak/StreakSummaryModal'
import { Card, CardTitle } from '../../ui/card'
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

  const content = (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <CardTitle className="text-sm uppercase tracking-wider">
          Streak de connexion
        </CardTitle>
        {isOwnProfile && <ChevronRight size={16} className="text-text-light" />}
      </div>
      <div className="flex items-end gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Flame
              size={28}
              color="#fb923c"
              style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' }}
            />
            <span className="font-display text-[64px] font-extrabold leading-none">
              {profile.streakDays}
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">
            Jour
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-primary-light" />
            <span className="font-display text-[36px] font-extrabold leading-none">
              {profile.bestStreak}
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">
            Record
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        {days.map((d) => {
          const active = d.isToday && todayActive
          return (
            <div
              key={d.dow}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span
                className="h-[6px] w-full rounded-full"
                style={{
                  background: active
                    ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                    : 'var(--muted)',
                  boxShadow: active
                    ? '0 0 8px rgba(251, 146, 60, 0.5)'
                    : undefined,
                }}
              />
              <span className="font-mono text-[10px] text-text-light">
                {d.label}
              </span>
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
          onClick={() => setOpen(true)}
          className="rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-[0_2px_0_rgba(27,23,38,0.04),0_12px_30px_-12px_rgba(27,23,38,0.08)] text-left w-full cursor-pointer hover:border-border-dark transition-colors"
        >
          {content}
        </button>
      ) : (
        <Card>{content}</Card>
      )}
      {isOwnProfile && (
        <StreakSummaryModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
