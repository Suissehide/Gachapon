import { Gift } from 'lucide-react'

import {
  useClaimAllRewards,
  useClaimReward,
  usePendingRewards,
} from '../../queries/useRewards.ts'
import { Button } from '../ui/button.tsx'
import { RewardCard } from './RewardCard.tsx'

interface RewardsPopupProps {
  onClose: () => void
}

export function RewardsPopup({ onClose: _ }: RewardsPopupProps) {
  const { data: rewards = [], isLoading } = usePendingRewards()
  const claimReward = useClaimReward()
  const claimAll = useClaimAllRewards()

  return (
    <div className="absolute right-0 top-10 z-50 rounded-xl border border-border bg-background shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-text-light" />
          <span className="text-sm font-semibold text-text">Récompenses</span>
          {rewards.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              {rewards.length}
            </span>
          )}
        </div>
        {rewards.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => claimAll.mutate(undefined)}
            disabled={claimAll.isPending}
            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
          >
            Tout réclamer
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="py-6 text-center">
            <Gift className="mx-auto mb-2 h-7 w-7 text-text-light/30" />
            <p className="text-xs text-text-light">
              Aucune récompense en attente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onClaim={(id) => claimReward.mutate(id)}
                isLoading={claimReward.isPending || claimAll.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
