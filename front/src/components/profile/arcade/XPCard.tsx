import type { UserProfile } from '../../../api/profile.api'

type Props = { profile: UserProfile }

export function XPCard({ profile }: Props) {
  const isMax = profile.level >= 100
  const xpForLevel = (n: number) => (n - 1) ** 2 * 100
  const xpInLevel = profile.xp - xpForLevel(profile.level)
  const xpNeeded = xpForLevel(profile.level + 1) - xpForLevel(profile.level)
  const percent = isMax ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return (
    <div
      className="rounded-2xl bg-[var(--arcade-surface)] border border-[var(--arcade-border)] p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">Expérience</h3>
        <span
          className="font-mono text-[11px] font-bold uppercase"
          style={{
            color: isMax ? 'var(--arcade-amber)' : 'var(--arcade-text-muted)',
          }}
        >
          {isMax ? `LV. ${profile.level} · MAX` : `LV. ${profile.level}`}
        </span>
      </div>
      <div className="relative h-[22px] rounded-full bg-[var(--arcade-surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #22c55e, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 4s linear infinite',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)',
          }}
        />
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative segments
              key={i}
              className="flex-1 border-r border-white/45 last:border-r-0"
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[11px] mt-3">
        <span className="text-[var(--arcade-text-muted)]">
          {isMax ? '00 / MAX' : `${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')}`}
        </span>
        <span style={{ color: 'var(--arcade-amber)' }}>+ Prestige bientôt</span>
      </div>
    </div>
  )
}
