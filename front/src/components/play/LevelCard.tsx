import { Star } from 'lucide-react'

import { DEFAULT_ECONOMY, useEconomyConfig } from '../../queries/useEconomyConfig.ts'
import { useUserProfile } from '../../queries/useProfile.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { computeLevel, xpForLevel } from '../../utils/level.ts'

export function LevelCard() {
  const username = useAuthStore((s) => s.user?.username ?? '')
  const { data: profile } = useUserProfile(username)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const xp = profile?.xp ?? 0
  const level = computeLevel(xp, economy.xp)
  const isMaxLevel = level >= economy.xp.levelCap
  const xpStart = xpForLevel(level, economy.xp)
  const xpNext = xpForLevel(level + 1, economy.xp)
  const xpRange = xpNext - xpStart
  const xpPercent = isMaxLevel
    ? 100
    : xpRange === 0
      ? 100
      : Math.max(0, Math.min(1, (xp - xpStart) / xpRange)) * 100

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Star className="h-3.5 w-3.5 text-accent" />
          Niveau
        </span>
        <span className="flex items-center gap-1.5 font-display text-xl font-extrabold tabular-nums leading-none">
          {level}
          {isMaxLevel && (
            <em className="rounded-full bg-linear-to-br from-primary to-secondary px-1.5 py-0.5 font-mono text-[8.5px] font-bold not-italic tracking-[0.14em] text-white">
              MAX
            </em>
          )}
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-secondary transition-[width] duration-500"
          style={{ width: `${xpPercent}%` }}
        />
      </div>
      {!isMaxLevel && (
        <p className="mt-1 text-right font-mono text-[9px] tabular-nums text-text-light/60">
          {xpNext - xp} XP avant niveau {level + 1}
        </p>
      )}
    </div>
  )
}
