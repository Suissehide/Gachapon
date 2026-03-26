import { Flame, Sparkles, Star, Ticket, Trophy } from 'lucide-react'

import type { PendingReward } from '../../api/rewards.api.ts'
import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'

interface RewardCardProps {
  reward: PendingReward
  onClaim: (id: string) => void
  isLoading: boolean
}

function sourceLabel(reward: PendingReward): string {
  if (reward.source === 'STREAK' && reward.streakMilestone) {
    return `Streak — Jour ${reward.streakMilestone.day}`
  }
  if (reward.source === 'ACHIEVEMENT') return 'Achievement'
  if (reward.source === 'QUEST') return 'Quête'
  return 'Récompense'
}

function SourceIcon({ reward }: { reward: PendingReward }) {
  if (reward.source === 'STREAK') return <Flame className="h-4 w-4 text-orange-500" />
  if (reward.source === 'ACHIEVEMENT') return <Trophy className="h-4 w-4 text-yellow-400" />
  return <Star className="h-4 w-4 text-primary" />
}

export function RewardCard({ reward, onClaim, isLoading }: RewardCardProps) {
  const isMilestone = reward.streakMilestone?.isMilestone ?? false

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-colors',
        isMilestone
          ? 'border-yellow-500/40 bg-yellow-500/5'
          : 'border-border bg-card',
      )}
    >
      {/* Source icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          isMilestone ? 'bg-yellow-500/15' : 'bg-muted',
        )}
      >
        <SourceIcon reward={reward} />
      </div>

      {/* Source label + amounts */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-text">{sourceLabel(reward)}</span>
          {isMilestone && (
            <span className="flex items-center gap-0.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500">
              <Trophy className="h-2.5 w-2.5" />
              Jalon
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          {reward.reward.tokens > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-text">
              <Ticket className="h-3 w-3 text-primary" />
              {reward.reward.tokens}
            </span>
          )}
          {reward.reward.dust > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-text">
              <Sparkles className="h-3 w-3 text-accent" />
              {reward.reward.dust}
            </span>
          )}
          {reward.reward.xp > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-text">
              <Star className="h-3 w-3 text-yellow-400" />
              {reward.reward.xp} XP
            </span>
          )}
        </div>
      </div>

      {/* Claim */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onClaim(reward.id)}
        disabled={isLoading}
        className="shrink-0"
      >
        Réclamer
      </Button>
    </div>
  )
}
