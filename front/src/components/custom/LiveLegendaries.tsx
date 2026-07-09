import { Sparkles } from 'lucide-react'

import { cn } from '../../libs/utils.ts'

export function LiveLegendaries({
  activeToday,
  recent,
}: {
  activeToday: number
  recent: { cardName: string; pulledAt: string }[]
}): React.JSX.Element {
  const rendered =
    recent.length > 0
      ? ['a', 'b'].flatMap((half) =>
          recent.map((r, i) => ({ ...r, key: `${half}-${i}` })),
        )
      : []

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          <span className="font-black tabular-nums">
            {activeToday.toLocaleString('fr-FR')}
          </span>{' '}
          joueurs actifs aujourd'hui
        </p>
      </div>

      {rendered.length > 0 && (
        <div className="group relative overflow-hidden">
          <div
            className={cn(
              'flex w-max gap-3 whitespace-nowrap',
              'animate-[marquee_28s_linear_infinite] group-hover:[animation-play-state:paused]',
              'motion-reduce:animate-none',
            )}
          >
            {rendered.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background px-4 py-2 text-sm text-text-light"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Une légendaire vient d'être tirée :{' '}
                <span className="font-semibold text-foreground">
                  {r.cardName}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
