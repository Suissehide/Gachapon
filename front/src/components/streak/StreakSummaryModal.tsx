import { Flame, Lock, Trophy } from 'lucide-react'

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
            Récompenses de connexion quotidienne
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          {isLoading || !data ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current streak summary */}
              <div className="flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-3">
                <div className="text-center">
                  <p className="text-2xl font-black text-text">{data.streakDays}</p>
                  <p className="text-[11px] text-text-light">Actuel</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    <p className="text-2xl font-black text-text">{data.bestStreak}</p>
                  </div>
                  <p className="text-[11px] text-text-light">Record</p>
                </div>
                <div className="ml-auto text-right text-xs text-text-light">
                  <p>
                    Par défaut :{' '}
                    <span className="font-semibold text-text">
                      {data.default.tokens} 🎫 · {data.default.dust} ✨ · {data.default.xp} XP
                    </span>
                  </p>
                </div>
              </div>

              {/* 30-day grid */}
              <div className="grid grid-cols-6 gap-1.5">
                {data.days.map((entry) => {
                  const isPast = entry.status === 'past'
                  const isCurrent = entry.status === 'current'

                  return (
                    <div
                      key={entry.day}
                      title={`Jour ${entry.day} — ${entry.tokens} tokens · ${entry.dust} dust · ${entry.xp} XP`}
                      className={[
                        'relative flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all',
                        entry.isMilestone
                          ? 'border border-yellow-400/60 bg-yellow-400/10'
                          : 'border border-border bg-card',
                        isCurrent ? 'ring-2 ring-primary shadow-sm shadow-primary/20' : '',
                        isPast ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      {entry.isMilestone && (
                        <Flame className="h-3 w-3 text-yellow-400 mb-0.5" />
                      )}
                      {!entry.isMilestone && entry.status === 'future' && (
                        <Lock className="h-2.5 w-2.5 text-text-light/40 mb-0.5" />
                      )}
                      <span
                        className={[
                          'text-[11px] font-bold leading-none',
                          isCurrent ? 'text-primary' : 'text-text',
                        ].join(' ')}
                      >
                        {entry.day}
                      </span>
                      <span className="mt-0.5 text-[9px] text-text-light leading-none">
                        {entry.tokens}🎫
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-xs text-text-light">
                Les jalons spéciaux remplacent la récompense quotidienne.
              </p>
            </div>
          )}
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}
