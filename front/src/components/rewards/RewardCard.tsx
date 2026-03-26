import type { PendingReward } from '../../api/rewards.api.ts'
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
  if (reward.source === 'ACHIEVEMENT') {
    return 'Achievement'
  }
  if (reward.source === 'QUEST') {
    return 'Quête'
  }
  return 'Récompense'
}

export function RewardCard({ reward, onClaim, isLoading }: RewardCardProps) {
  const isMilestone = reward.streakMilestone?.isMilestone ?? false

  const borderClass = isMilestone ? 'border-yellow-400' : 'border-border'
  const bgClass = isMilestone ? 'bg-yellow-50' : 'bg-card'

  return (
    <div
      className={`rounded-lg border ${borderClass} ${bgClass} p-3 transition-colors`}
    >
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-text">{sourceLabel(reward)}</h3>
      </div>

      <div className="mb-3 flex flex-col gap-1">
        {reward.reward.tokens > 0 && (
          <div className="text-xs text-text-light">
            🎫 {reward.reward.tokens} tokens
          </div>
        )}
        {reward.reward.dust > 0 && (
          <div className="text-xs text-text-light">
            ✨ {reward.reward.dust} dust
          </div>
        )}
        {reward.reward.xp > 0 && (
          <div className="text-xs text-text-light">
            ⭐ {reward.reward.xp} XP
          </div>
        )}
      </div>

      <Button
        size="sm"
        onClick={() => onClaim(reward.id)}
        disabled={isLoading}
        className="w-full"
      >
        Réclamer
      </Button>
    </div>
  )
}
