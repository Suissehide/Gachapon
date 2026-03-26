import { useEffect, useRef, useState } from 'react'

import { RewardsPopup } from './RewardsPopup.tsx'

interface RewardsBadgeProps {
  pendingRewardsCount: number
}

export function RewardsBadge({ pendingRewardsCount }: RewardsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Handle click outside to close popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const displayCount =
    pendingRewardsCount > 9 ? '9+' : String(pendingRewardsCount)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-lg p-2 text-lg hover:bg-muted transition-colors"
        aria-label="Récompenses"
      >
        🎁
      </button>

      {pendingRewardsCount > 0 && (
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {displayCount}
        </div>
      )}

      {isOpen && <RewardsPopup onClose={() => setIsOpen(false)} />}
    </div>
  )
}
