import { ChevronRight, Flame } from 'lucide-react'
import { useState } from 'react'

import { cn } from '../../libs/utils.ts'
import { useStreakSummary } from '../../queries/useStreak.ts'
import { StreakSummaryModal } from '../streak/StreakSummaryModal.tsx'

export function StreakCard() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: streak } = useStreakSummary()

  const streakDays = streak?.streakDays ?? 0
  const cycleDay = streakDays === 0 ? 0 : ((streakDays - 1) % 30) + 1

  return (
    <>
      <button
        type="button"
        className="group w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-border-dark"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            Streak
          </span>
          <span className="flex items-center gap-1 font-display text-xl font-extrabold tabular-nums leading-none">
            {cycleDay}
            <span className="text-[13px] font-bold text-text-light/60">
              /30
            </span>
            <ChevronRight className="h-3 w-3 text-text-light/40 transition-colors group-hover:text-text-light" />
          </span>
        </div>
        <div className="mt-2 flex gap-[2.5px]">
          {Array.from({ length: 30 }, (_, i) => {
            const day = i + 1
            return (
              <span
                key={day}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i < cycleDay ? 'bg-linear-to-r from-primary to-primary-light' : 'bg-border',
                )}
              />
            )
          })}
        </div>
      </button>

      <StreakSummaryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
