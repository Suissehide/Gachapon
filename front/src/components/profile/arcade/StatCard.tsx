import type { LucideIcon } from 'lucide-react'

import type { ArcadeRarity } from './utils'
import { RARITY_COLORS } from './utils'

type Props = {
  icon: LucideIcon
  label: string
  value: number
  rarity: ArcadeRarity
  hint?: string
}

export function StatCard({ icon: Icon, label, value, rarity, hint }: Props) {
  const color = RARITY_COLORS[rarity]
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-[22px] pl-[18px] flex items-center gap-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <span className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} />
      <span
        className="absolute -right-12 -top-12 w-44 h-44 rounded-full -z-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-30"
        style={{ background: color, opacity: 0.12 }}
      />
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
        style={{
          background: `color-mix(in srgb, ${color} 18%, white)`,
          color,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--arcade-text-muted)]">
          {label}
        </span>
        <span className="font-display text-[48px] font-extrabold leading-none tabular-nums text-[var(--arcade-text)]">
          {value.toLocaleString('fr-FR')}
        </span>
        {hint && (
          <span className="italic text-xs text-[var(--arcade-text-muted)] mt-1">{hint}</span>
        )}
      </div>
    </div>
  )
}
