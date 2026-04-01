import { Flame, Sparkles, Star, Ticket, Trophy, Zap } from 'lucide-react'
import { type ReactNode, useState } from 'react'

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
    if (reward.streakMilestone.day === 0) {
      return 'Streak — Connexion quotidienne'
    }
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

const SOURCE_CONFIG = {
  STREAK: {
    icon: <Flame className="h-3.5 w-3.5 text-orange-400" />,
    gradientFrom:
      '[background-image:linear-gradient(135deg,rgba(249,115,22,0.06)_0%,transparent_60%)]',
  },
  ACHIEVEMENT: {
    icon: <Trophy className="h-3.5 w-3.5 text-yellow-400" />,
    gradientFrom:
      '[background-image:linear-gradient(135deg,rgba(250,204,21,0.06)_0%,transparent_60%)]',
  },
  QUEST: {
    icon: <Zap className="h-3.5 w-3.5 text-purple-400" />,
    gradientFrom:
      '[background-image:linear-gradient(135deg,rgba(168,85,247,0.07)_0%,transparent_60%)]',
  },
} as const

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-px">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[15px] font-black tabular-nums leading-none text-text">
          {value}
        </span>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-text-light/50">
        {label}
      </span>
    </div>
  )
}

export function RewardCard({ reward, onClaim, isLoading }: RewardCardProps) {
  const isMilestone = reward.streakMilestone?.isMilestone ?? false
  const cfg = SOURCE_CONFIG[reward.source] ?? SOURCE_CONFIG.STREAK
  const [claiming, setClaiming] = useState(false)

  const handleClaim = () => {
    setClaiming(true)
    setTimeout(() => onClaim(reward.id), 300)
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border',
        'transition-[transform,opacity] duration-300 ease-in',
        cfg.gradientFrom,
        isMilestone && [
          '[border-left-color:theme(colors.yellow.400)]',
          '[background-image:linear-gradient(135deg,rgba(245,158,11,0.10)_0%,transparent_55%)]',
          'shadow-[0_0_18px_rgba(245,158,11,0.14)]',
        ],
        claiming && 'translate-x-[110%] opacity-0',
      )}
    >
      <div className="flex items-center gap-12 px-3 py-2.5">
        {/* Left: source + amounts */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Source row */}
          <div className="flex items-center gap-1.5">
            {cfg.icon}
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-light/70">
              {sourceLabel(reward)}
            </span>
            {isMilestone && (
              <span className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-yellow-400">
                <Trophy className="h-2.5 w-2.5" />
                Jalon
              </span>
            )}
          </div>

          {/* Amounts */}
          <div className="flex items-center gap-4">
            {reward.reward.tokens > 0 && (
              <Stat
                icon={<Ticket className="h-3.5 w-3.5 text-primary" />}
                value={reward.reward.tokens}
                label="ticket"
              />
            )}
            {reward.reward.dust > 0 && (
              <Stat
                icon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
                value={reward.reward.dust}
                label="poussière"
              />
            )}
            {reward.reward.xp > 0 && (
              <Stat
                icon={<Star className="h-3.5 w-3.5 text-yellow-400" />}
                value={reward.reward.xp}
                label="XP"
              />
            )}
          </div>
        </div>

        {/* Right: claim button — centré verticalement sur toute la hauteur */}
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={isLoading || claiming}
          className={cn(
            'shrink-0',
            isMilestone && 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
          )}
        >
          Réclamer
        </Button>
      </div>
    </div>
  )
}
