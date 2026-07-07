import { Gem } from 'lucide-react'

import { useTokenBalance } from '../../queries/useGacha.ts'

export function PityCard() {
  const { data: balance } = useTokenBalance()

  const current = balance?.pityCurrent ?? 0
  const threshold = balance?.pityThreshold ?? 0
  const left = Math.max(0, threshold - current)
  const pct = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Gem className="h-3.5 w-3.5 text-secondary" />
          Garantie
        </span>
        <span className="text-[13px] text-text-light">
          {threshold === 0 ? (
            '—'
          ) : left === 0 ? (
            <b className="font-display text-[15px] text-secondary">
              Légendaire au prochain tirage !
            </b>
          ) : (
            <>
              Légendaire dans{' '}
              <b className="font-display text-[17px] tabular-nums text-secondary">
                {left}
              </b>{' '}
              tirage{left > 1 ? 's' : ''}
            </>
          )}
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--secondary), var(--rarity-legendary))',
          }}
        />
      </div>
    </div>
  )
}
