import { Gift } from 'lucide-react'

import { Button } from '../ui/button.tsx'
import { Popup, PopupTrigger } from '../ui/popup.tsx'
import { RewardsPopup } from './RewardsPopup.tsx'

interface RewardsBadgeProps {
  pendingRewardsCount: number
}

export function RewardsBadge({ pendingRewardsCount }: RewardsBadgeProps) {
  const displayCount = pendingRewardsCount > 9 ? '9+' : String(pendingRewardsCount)

  return (
    <Popup>
      <div className="relative">
        <PopupTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Récompenses"
            className="text-text-light hover:text-text"
          >
            <Gift className="h-4 w-4" />
          </Button>
        </PopupTrigger>

        {pendingRewardsCount > 0 && (
          <div className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {displayCount}
          </div>
        )}
      </div>

      <RewardsPopup />
    </Popup>
  )
}
