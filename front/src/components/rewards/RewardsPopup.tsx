import { Button } from '../ui/button.tsx'
import {
  useClaimAllRewards,
  useClaimReward,
  usePendingRewards,
} from '../../queries/useRewards.ts'
import { RewardCard } from './RewardCard.tsx'

interface RewardsPopupProps {
  onClose: () => void
}

export function RewardsPopup({ onClose }: RewardsPopupProps) {
  const { data: rewards = [], isLoading } = usePendingRewards()
  const claimReward = useClaimReward()
  const claimAll = useClaimAllRewards()

  const handleClaim = (rewardId: string) => {
    claimReward.mutate(rewardId)
  }

  const handleClaimAll = () => {
    claimAll.mutate(undefined, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  return (
    <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-border bg-background shadow-lg p-4">
      {/* Header with title and "Claim All" button */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">
          Récompenses disponibles
        </h2>
        {rewards.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClaimAll}
            disabled={claimAll.isPending}
          >
            Tout réclamer
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-4 text-center text-sm text-text-light">
          Chargement…
        </div>
      ) : rewards.length === 0 ? (
        <div className="py-4 text-center text-sm text-text-light">
          Aucune récompense en attente.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onClaim={handleClaim}
              isLoading={claimReward.isPending || claimAll.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
