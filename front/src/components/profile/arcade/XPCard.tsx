import type { UserProfile } from '../../../api/profile.api'
import { DEFAULT_ECONOMY, useEconomyConfig } from '../../../queries/useEconomyConfig'
import { xpForLevel } from '../../../utils/level'
import { Card, CardTitle } from '../../ui/card'

type Props = { profile: UserProfile }

export function XPCard({ profile }: Props) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const isMax = profile.level >= economy.xp.levelCap
  const xpInLevel = profile.xp - xpForLevel(profile.level, economy.xp)
  const xpNeeded = xpForLevel(profile.level + 1, economy.xp) - xpForLevel(profile.level, economy.xp)
  const percent = isMax ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <CardTitle className="text-sm uppercase tracking-wider">Expérience</CardTitle>
        <span
          className="font-mono text-[11px] font-bold uppercase"
          style={{
            color: isMax ? 'var(--primary)' : 'var(--text-light)',
          }}
        >
          {isMax ? `LV. ${profile.level} · MAX` : `LV. ${profile.level}`}
        </span>
      </div>
      <div className="relative h-[22px] rounded-full bg-muted overflow-hidden">
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
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative segments, no reorder
              key={i}
              className="flex-1 border-r border-white/45 last:border-r-0"
            />
          ))}
        </div>
      </div>
      <div className="font-mono text-[11px] mt-3 text-text-light">
        {isMax
          ? '00 / MAX'
          : `${xpInLevel.toLocaleString('fr-FR')} / ${xpNeeded.toLocaleString('fr-FR')}`}
      </div>
    </Card>
  )
}
