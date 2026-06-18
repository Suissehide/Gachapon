import { Award, Coins, Lock, Sparkles, Star } from 'lucide-react'

import type { AchievementWithProgress } from '../../constants/achievements.constant'

interface Props {
  achievement: AchievementWithProgress
}

export function AchievementCard({ achievement }: Props) {
  const pct = Math.min(
    100,
    Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100),
  )
  const inProgress = !achievement.unlocked && achievement.progress > 0

  // Three visual states mirror the profile cards:
  //   • Unlocked → amber gradient avatar + warm tint background (SetsProgressionCard /
  //     StreakCard pattern with the arcade amber palette).
  //   • In progress → neutral border with a subtle progress bar.
  //   • Locked → muted tile with a lock icon, slight de-saturation.
  const wrapStyle = achievement.unlocked
    ? {
        background:
          'linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(245, 158, 11, 0.02) 70%, transparent)',
        borderColor: 'rgba(251, 191, 36, 0.45)',
      }
    : inProgress
      ? { background: 'var(--card)', borderColor: 'var(--border)' }
      : {
          background: 'rgba(0, 0, 0, 0.015)',
          borderColor: 'var(--border)',
        }

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4 transition-colors"
      style={wrapStyle}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-white"
          style={
            achievement.unlocked
              ? {
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  boxShadow: '0 6px 18px -8px rgba(245, 158, 11, 0.55)',
                }
              : {
                  background: 'var(--muted)',
                  color: 'var(--text-light)',
                }
          }
        >
          {achievement.unlocked || inProgress ? (
            <Award className="h-5 w-5" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-bold text-text">
            {achievement.name}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-light">
            {achievement.unlocked
              ? 'Débloqué'
              : inProgress
                ? 'En cours'
                : 'À débloquer'}
          </div>
        </div>

        <div
          className="font-display text-[24px] font-extrabold leading-none tabular-nums"
          style={{
            color: achievement.unlocked
              ? '#b45309'
              : inProgress
                ? 'var(--text)'
                : 'var(--text-light)',
          }}
        >
          {pct}%
        </div>
      </div>

      <p className="mt-3 font-body text-xs leading-snug text-text-light">
        {achievement.description}
      </p>

      <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: achievement.unlocked
              ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
              : 'linear-gradient(90deg, #fcd34d, #fbbf24)',
          }}
        />
      </div>

      {!achievement.unlocked && (
        <div className="mt-1 flex justify-end font-mono text-[10px] tabular-nums text-text-light/70">
          {achievement.progress} / {achievement.threshold}
        </div>
      )}

      {achievement.reward && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-light">
            Récompense
          </span>
          {achievement.reward.tokens > 0 && (
            <span className="flex items-center gap-1 font-display text-sm font-extrabold tabular-nums text-text">
              <Coins className="h-3.5 w-3.5 text-primary" />
              {achievement.reward.tokens}
            </span>
          )}
          {achievement.reward.dust > 0 && (
            <span className="flex items-center gap-1 font-display text-sm font-extrabold tabular-nums text-text">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              {achievement.reward.dust}
            </span>
          )}
          {achievement.reward.xp > 0 && (
            <span className="flex items-center gap-1 font-display text-sm font-extrabold tabular-nums text-text">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              {achievement.reward.xp}
              <span className="ml-0.5 font-mono text-[9px] uppercase tracking-wider text-text-light">
                XP
              </span>
            </span>
          )}
          {achievement.reward.cardRarity && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              + carte {achievement.reward.cardRarity}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
