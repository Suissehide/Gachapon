import { Gift } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../ui/button.tsx'
import { RewardsPopup } from './RewardsPopup.tsx'

interface RewardsBadgeProps {
  pendingRewardsCount: number
}

export function RewardsBadge({ pendingRewardsCount }: RewardsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const displayCount =
    pendingRewardsCount > 9 ? '9+' : String(pendingRewardsCount)

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Récompenses"
        className="text-text-light hover:text-text"
      >
        <Gift className="h-4 w-4" />
      </Button>

      {pendingRewardsCount > 0 && (
        <div className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] font-bold text-white">
          {displayCount}
        </div>
      )}

      {isOpen && <RewardsPopup onClose={() => setIsOpen(false)} />}
    </div>
  )
}
