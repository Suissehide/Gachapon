import { Link } from '@tanstack/react-router'
import { Award, ChevronRight, HelpCircle, Lock } from 'lucide-react'

import type { AchievementWithProgress } from '../../../constants/achievements.constant'
import { useAchievements } from '../../../queries/useAchievements'
import { Card, CardTitle } from '../../ui/card'

const VISIBLE_COUNT = 4

function pickHighlights(achievements: AchievementWithProgress[]): AchievementWithProgress[] {
  const unlocked = achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))

  const inProgress = achievements
    .filter((a) => !a.unlocked && !a.hidden && a.progress > 0)
    .sort((a, b) => b.progress / b.threshold - a.progress / a.threshold)

  const locked = achievements
    .filter((a) => !a.unlocked && !a.hidden && a.progress === 0)
    .sort((a, b) => a.threshold - b.threshold)

  return [...unlocked, ...inProgress, ...locked].slice(0, VISIBLE_COUNT)
}

function HighlightRow({ achievement }: { achievement: AchievementWithProgress }) {
  const pct = Math.min(
    100,
    Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100),
  )
  const inProgress = !achievement.unlocked && achievement.progress > 0

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{
          background: achievement.unlocked
            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
            : 'var(--muted)',
          boxShadow: achievement.unlocked
            ? '0 0 12px rgba(251, 191, 36, 0.35)'
            : undefined,
        }}
      >
        {achievement.unlocked ? (
          <Award className="h-4 w-4 text-white" />
        ) : achievement.progress > 0 ? (
          <Award className="h-4 w-4 text-text-light/60" />
        ) : (
          <Lock className="h-4 w-4 text-text-light/40" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-bold text-text">
          {achievement.name}
        </div>

        {achievement.unlocked ? (
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-600">
            Débloqué
          </div>
        ) : inProgress ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-text-light">
              {achievement.progress} / {achievement.threshold}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/60">
            À débloquer
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyHint() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/30 px-4 py-6">
      <HelpCircle className="h-5 w-5 text-text-light/40" />
      <div>
        <div className="font-display text-sm font-bold text-text-light">
          Aucun succès pour l'instant
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-text-light/60">
          Joue pour débloquer tes premiers
        </div>
      </div>
    </div>
  )
}

export function AchievementsCard() {
  const { data, isLoading } = useAchievements()

  const achievements = data ?? []
  const total = achievements.length
  const unlocked = achievements.filter((a) => a.unlocked).length
  const highlights = pickHighlights(achievements)

  return (
    <Card className="p-6">
      <Link
        to="/achievements"
        className="group -m-2 mb-3 flex items-baseline justify-between rounded-xl p-2 transition-colors hover:bg-muted/30"
      >
        <CardTitle className="text-sm uppercase tracking-wider">Succès</CardTitle>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text-light">
            {unlocked} / {total} <span className="hidden sm:inline">DÉBLOQUÉS</span>
          </span>
          <ChevronRight
            size={16}
            className="text-text-light transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Link>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={i}
              className="h-[58px] animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <EmptyHint />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {highlights.map((a) => (
            <HighlightRow key={a.key} achievement={a} />
          ))}
        </div>
      )}
    </Card>
  )
}
