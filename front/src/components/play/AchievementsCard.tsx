import { useNavigate } from '@tanstack/react-router'
import { Award, ChevronRight } from 'lucide-react'

import { useAchievements } from '../../queries/useAchievements.ts'

export function AchievementsCard() {
  const navigate = useNavigate()
  const { data, isPending } = useAchievements()

  if (isPending || !data || data.length === 0) {
    return null
  }
  const total = data.length
  const unlocked = data.filter((a) => a.unlocked).length
  const pct = Math.round((unlocked / total) * 100)

  return (
    <button
      type="button"
      className="group w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-border-dark"
      onClick={() => navigate({ to: '/achievements' })}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Succès
        </span>
        <span className="flex items-center gap-1 font-display text-xl font-extrabold tabular-nums leading-none">
          {unlocked}
          <span className="text-[13px] font-bold text-text-light/60">
            /{total}
          </span>
          <ChevronRight className="h-3 w-3 text-text-light/40 transition-colors group-hover:text-text-light" />
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-text-light/60">
          {pct}%
        </span>
      </div>
    </button>
  )
}
