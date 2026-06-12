import { Award, Coins, Sparkles, Star } from 'lucide-react'
import { cn } from '../../libs/utils.ts'
import type { AchievementWithProgress } from '../../constants/achievements.constant'

interface Props {
  achievement: AchievementWithProgress
}

export function AchievementCard({ achievement }: Props) {
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100))
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3',
        achievement.unlocked
          ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent'
          : 'border-border bg-card/50 opacity-90',
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'rounded-full p-2',
            achievement.unlocked ? 'bg-amber-500/30 text-amber-200' : 'bg-muted/40 text-text-light/40',
          )}
        >
          <Award className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text">{achievement.name}</div>
          <div className="text-xs text-text-light/70">{achievement.description}</div>
        </div>
      </div>

      {!achievement.unlocked && (
        <div className="mt-1">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-light/60">
            <span>Progression</span>
            <span className="tabular-nums">{achievement.progress} / {achievement.threshold}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted/40">
            <div className="h-full rounded bg-amber-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {achievement.reward && (
        <div className="flex items-center gap-3 border-t border-border/40 pt-2 text-xs">
          {achievement.reward.tokens > 0 && (
            <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-primary" />{achievement.reward.tokens}</span>
          )}
          {achievement.reward.dust > 0 && (
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-400" />{achievement.reward.dust}</span>
          )}
          {achievement.reward.xp > 0 && (
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{achievement.reward.xp} XP</span>
          )}
          {achievement.reward.cardRarity && (
            <span className="text-[10px] uppercase text-emerald-400">+ carte {achievement.reward.cardRarity}</span>
          )}
        </div>
      )}
    </div>
  )
}
