import { Coins, Flame, Lock, Sparkles, Star, Trophy } from 'lucide-react'

import { useStreakSummary } from '../../queries/useStreak.ts'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  open: boolean
  onClose: () => void
}

export function StreakSummaryModal({ open, onClose }: Props) {
  const { data, isLoading } = useStreakSummary()

  return (
    <Popup open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle icon={<Flame className="h-4 w-4" />}>
            Connexion quotidienne
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          {isLoading || !data ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">

              {/* ── Hero: streak progress ── */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-400/5 to-transparent p-5">
                {/* Glow spot */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />

                <div className="flex items-end gap-4">
                  {/* Streak counter */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-6xl font-black leading-none tabular-nums text-primary">
                        {data.streakDays}
                      </span>
                      <Flame className="mb-1 h-7 w-7 text-orange-400" />
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-light">
                      jour{data.streakDays !== 1 ? 's' : ''} de suite
                    </p>
                  </div>

                  {/* Best streak */}
                  <div className="ml-auto pb-1 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-xl font-black tabular-nums text-text">
                        {data.bestStreak}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-text-light">
                      Record
                    </p>
                  </div>
                </div>

                {/* 30-segment progress bar */}
                <div className="mt-4 flex gap-0.5">
                  {data.days.map((entry) => (
                    <div
                      key={entry.day}
                      className={[
                        'h-1.5 flex-1 rounded-full',
                        entry.status === 'past'
                          ? 'bg-primary/50'
                          : entry.status === 'current'
                            ? 'bg-primary animate-pulse'
                            : 'bg-border',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-[9px] font-medium text-text-light/40">Jour 1</span>
                  <span className="text-[9px] font-medium text-text-light/40">Jour 30</span>
                </div>
              </div>

              {/* ── 30-day calendar ── */}
              <div className="grid grid-cols-6 gap-1.5">
                {data.days.map((entry) => {
                  const isPast = entry.status === 'past'
                  const isCurrent = entry.status === 'current'

                  return (
                    <div
                      key={entry.day}
                      className={[
                        'flex flex-col gap-1 rounded-lg border px-2 py-1.5',
                        // Past (earned) — amber tint
                        isPast && !entry.isMilestone && 'border-primary/25 bg-primary/8',
                        isPast && entry.isMilestone && 'border-yellow-400/40 bg-yellow-400/12',
                        // Current — stronger highlight
                        isCurrent && !entry.isMilestone && 'border-primary bg-primary/15 ring-1 ring-primary shadow-sm shadow-primary/20',
                        isCurrent && entry.isMilestone && 'border-yellow-400 bg-yellow-400/20 ring-1 ring-yellow-400/60 shadow-sm shadow-yellow-400/20',
                        // Future — neutral, dimmed
                        entry.status === 'future' && !entry.isMilestone && 'border-border bg-card opacity-50',
                        entry.status === 'future' && entry.isMilestone && 'border-yellow-400/25 bg-yellow-400/5 opacity-50',
                      ].filter(Boolean).join(' ')}
                    >
                      {/* Day label */}
                      <div className="flex items-center gap-0.5">
                        {entry.isMilestone
                          ? <Flame className={['h-2.5 w-2.5 shrink-0', isPast ? 'text-yellow-400/70' : 'text-yellow-400'].join(' ')} />
                          : entry.status === 'future'
                            ? <Lock className="h-2 w-2 shrink-0 text-text-light/30" />
                            : null
                        }
                        <span className={[
                          'text-[11px] font-bold leading-none tabular-nums',
                          isCurrent ? 'text-primary' : isPast ? 'text-text' : 'text-text-light/50',
                        ].join(' ')}>
                          {entry.day}
                        </span>
                      </div>

                      {/* Rewards — inline */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {entry.tokens > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Coins className="h-2 w-2 shrink-0 text-yellow-400" />
                            <span className={['text-[9px] tabular-nums font-semibold', entry.status === 'future' ? 'text-text-light/40' : 'text-text'].join(' ')}>{entry.tokens}</span>
                          </span>
                        )}
                        {entry.dust > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Sparkles className="h-2 w-2 shrink-0 text-sky-400" />
                            <span className={['text-[9px] tabular-nums font-semibold', entry.status === 'future' ? 'text-text-light/40' : 'text-text'].join(' ')}>{entry.dust}</span>
                          </span>
                        )}
                        {entry.xp > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-2 w-2 shrink-0 text-purple-400" />
                            <span className={['text-[9px] tabular-nums font-semibold', entry.status === 'future' ? 'text-text-light/40' : 'text-text'].join(' ')}>{entry.xp}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-[10px] text-text-light/40">
                Les jalons spéciaux remplacent la récompense quotidienne.
              </p>
            </div>
          )}
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}

function RewardPill({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-text">
      {icon}{value}
    </span>
  )
}
