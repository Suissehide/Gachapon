import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronRight, Circle, Target } from 'lucide-react'

import { useQuests } from '../../queries/useQuests.ts'

export function QuestsCard() {
  const navigate = useNavigate()
  const { data: quests, isPending } = useQuests()

  const weekly = quests?.weekly.slice(0, 3) ?? []
  if (isPending || weekly.length === 0) {
    return null
  }
  const completedCount = weekly.filter((q) => q.completed).length

  return (
    <button
      type="button"
      className="group w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-border-dark"
      onClick={() => navigate({ to: '/quests' })}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Target className="h-3.5 w-3.5 text-emerald-500" />
          Quêtes
        </span>
        <span className="flex items-center gap-1 font-display text-xl font-extrabold tabular-nums leading-none">
          {completedCount}
          <span className="text-[13px] font-bold text-text-light/60">/3</span>
          <ChevronRight className="h-3 w-3 text-text-light/40 transition-colors group-hover:text-text-light" />
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {weekly.map((q) => (
          <div
            key={q.key}
            className="flex items-center gap-1.5 text-[12px] leading-tight"
          >
            {q.completed ? (
              <Check className="h-3 w-3 flex-shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-3 w-3 flex-shrink-0 text-text-light/30" />
            )}
            <span className="flex-1 truncate text-text-light">{q.name}</span>
            <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-text-light/60">
              {q.progress}/{q.target}
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}
