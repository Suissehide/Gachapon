import { Coins } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../../libs/utils.ts'
import { useTokenBalance } from '../../queries/useGacha.ts'

export function TokenCard() {
  const { data: balance } = useTokenBalance()
  const [now, setNow] = useState(() => Date.now())

  const tokens = balance?.tokens ?? 0
  const maxStock = balance?.maxStock ?? 6
  const isFull = tokens >= maxStock

  useEffect(() => {
    if (!balance?.nextTokenAt || isFull) {
      return
    }
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [balance?.nextTokenAt, isFull])

  const timeLeft =
    balance?.nextTokenAt && !isFull
      ? formatTimeLeft(balance.nextTokenAt, now)
      : null

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Jetons
        </span>
        <span className="font-display text-2xl font-extrabold tabular-nums leading-none">
          {tokens}
          <span className="text-[15px] font-bold text-text-light/60">
            /{maxStock}
          </span>
        </span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {Array.from({ length: maxStock }, (_, i) => {
          const pip = i + 1
          return (
            <span
              key={pip}
              className={cn(
                'h-2 flex-1 rounded-full',
                i < tokens
                  ? 'bg-linear-to-r from-primary to-primary-light shadow-[0_2px_6px_-2px_rgba(245,158,11,0.5)]'
                  : 'bg-border',
              )}
            />
          )
        })}
      </div>
      <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-light">
        {isFull ? (
          'Stockage plein'
        ) : timeLeft ? (
          <>
            +1 jeton dans <b className="text-primary-dark">{timeLeft}</b>
          </>
        ) : null}
      </p>
    </div>
  )
}

function formatTimeLeft(isoDate: string, now = Date.now()): string {
  const diff = new Date(isoDate).getTime() - now
  if (diff <= 0) {
    return 'bientôt'
  }
  const secondsLeft = Math.floor(diff / 1000)
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
