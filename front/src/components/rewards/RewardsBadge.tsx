import { Gift } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { NotificationDot } from '../notifications/NotificationDot.tsx'
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

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Récompenses"
        className="h-10 w-10 rounded-[11px] text-text-light/60 hover:bg-text/[0.06] hover:text-text"
      >
        <Gift className="h-5 w-5" />
      </Button>

      <NotificationDot count={pendingRewardsCount} />

      {isOpen && <RewardsPopup onClose={() => setIsOpen(false)} />}
    </div>
  )
}
