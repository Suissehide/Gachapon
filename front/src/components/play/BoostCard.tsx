import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, Zap } from 'lucide-react'

import { useShopItems } from '../../queries/useShop.ts'

export function BoostCard() {
  const navigate = useNavigate()
  const { data } = useShopItems()

  const activeBoosts = (data?.items ?? []).filter(
    (item) =>
      item.type === 'BOOST' &&
      item.activeBoost != null &&
      item.activeBoost.pullsRemaining > 0,
  )

  if (activeBoosts.length === 0) {
    return null
  }

  return (
    <button
      type="button"
      className="group w-full cursor-pointer rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:border-border-dark"
      onClick={() => navigate({ to: '/shop' })}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Boost
        </span>
        <ChevronRight className="h-3 w-3 text-text-light/40 transition-colors group-hover:text-text-light" />
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {activeBoosts.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-1.5 text-[12px] leading-tight"
          >
            <span className="flex-1 truncate text-text-light">{item.name}</span>
            <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-text-light/60">
              {item.activeBoost?.pullsRemaining} tirages
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}
