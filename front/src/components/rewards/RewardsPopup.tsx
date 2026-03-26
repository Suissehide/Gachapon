import { Gift } from 'lucide-react'

import {
  useClaimAllRewards,
  useClaimReward,
  usePendingRewards,
} from '../../queries/useRewards.ts'
import { Button } from '../ui/button.tsx'
import {
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { RewardCard } from './RewardCard.tsx'

export function RewardsPopup() {
  const { data: rewards = [], isLoading } = usePendingRewards()
  const claimReward = useClaimReward()
  const claimAll = useClaimAllRewards()

  return (
    <PopupContent>
      <PopupHeader>
        <PopupTitle icon={<Gift className="h-4 w-4" />}>
          Récompenses
          {rewards.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              {rewards.length}
            </span>
          )}
        </PopupTitle>
      </PopupHeader>

      <PopupBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="py-8 text-center">
            <Gift className="mx-auto mb-3 h-8 w-8 text-text-light/30" />
            <p className="text-sm font-medium text-text-light">Aucune récompense en attente.</p>
          </div>
        ) : (
          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
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
      </PopupBody>

      {rewards.length > 1 && (
        <PopupFooter>
          <Button
            onClick={() => claimAll.mutate(undefined)}
            disabled={claimAll.isPending}
            className="w-full"
          >
            Tout réclamer ({rewards.length})
          </Button>
        </PopupFooter>
      )}
    </PopupContent>
  )
}
