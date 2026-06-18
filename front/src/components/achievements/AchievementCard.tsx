import { Award, Coins, Lock, Sparkles, Star } from 'lucide-react'

import type { AchievementWithProgress } from '../../constants/achievements.constant'
import { cn } from '../../libs/utils.ts'

interface Props {
  achievement: AchievementWithProgress
}

export function AchievementCard({ achievement }: Props) {
  const pct = Math.min(
    100,
    Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100),
  )
  const inProgress = !achievement.unlocked && achievement.progress > 0

  return (
    <div
      className={cn(
        'relative flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors',
        achievement.unlocked
          ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-amber-400/[0.04] to-transparent'
          : 'border-border bg-card/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
            achievement.unlocked
              ? 'text-white'
              : inProgress
                ? 'bg-muted/40 text-text-light/60'
                : 'bg-muted/40 text-text-light/40',
          )}
          style={
            achievement.unlocked
              ? {
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  boxShadow: '0 0 14px rgba(251, 191, 36, 0.35)',
                }
              : undefined
          }
        >
          {achievement.unlocked || inProgress ? (
            <Award className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-text">
            {achievement.name}
          </div>
          <div className="mt-0.5 font-body text-xs leading-snug text-text-light/70">
            {achievement.description}
          </div>
        </div>
      </div>

      {!achievement.unlocked && (
        <div>
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-text-light/60">
            <span>Progression</span>
            <span className="tabular-nums">
              {achievement.progress} / {achievement.threshold}
            </span>
          </div>
          <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              }}
            />
          </div>
        </div>
      )}

      {achievement.reward && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2.5">
          {achievement.reward.tokens > 0 && (
            <span className="flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums text-text">
              <Coins className="h-3 w-3 text-primary" />
              {achievement.reward.tokens}
            </span>
          )}
          {achievement.reward.dust > 0 && (
            <span className="flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums text-text">
              <Sparkles className="h-3 w-3 text-violet-400" />
              {achievement.reward.dust}
            </span>
          )}
          {achievement.reward.xp > 0 && (
            <span className="flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums text-text">
              <Star className="h-3 w-3 text-amber-400" />
              {achievement.reward.xp} XP
            </span>
          )}
          {achievement.reward.cardRarity && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              + carte {achievement.reward.cardRarity}
            </span>
          )}
        </div>
      )}

      {achievement.unlocked && (
        <span className="absolute right-2.5 top-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-amber-600">
          Débloqué
        </span>
      )}
    </div>
  )
}
