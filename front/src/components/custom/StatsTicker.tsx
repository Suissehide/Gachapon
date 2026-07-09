import { cn } from '../../libs/utils.ts'

type TickerItem = { label: string; value: number; suffix?: string }

export function StatsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) {
    return null
  }
  const rendered = ['a', 'b'].flatMap((half) =>
    items.map((item, i) => ({ ...item, key: `${half}-${i}` })),
  )
  return (
    <div className="group relative overflow-hidden border-y border-border/50 bg-card/50 py-3">
      <div
        className={cn(
          'flex w-max gap-10 whitespace-nowrap',
          'animate-[marquee_30s_linear_infinite] group-hover:[animation-play-state:paused]',
          'motion-reduce:animate-none',
        )}
      >
        {rendered.map((item) => (
          <span
            key={item.key}
            className="flex items-baseline gap-2 text-sm text-text-light"
          >
            <span className="font-black tabular-nums text-foreground">
              {item.value.toLocaleString('fr-FR')}
              {item.suffix ?? ''}
            </span>
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
