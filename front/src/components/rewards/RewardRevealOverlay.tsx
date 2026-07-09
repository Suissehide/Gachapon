import { useRewardRevealStore } from '../../stores/rewardReveal.store.ts'
import { RevealGrid } from '../machine/reveal/RevealGrid.tsx'

/** Plays the full pull-reveal animation for cards granted by a claimed reward.
 *  Mounted once at the authenticated layout root; driven by rewardReveal.store. */
export function RewardRevealOverlay() {
  const cards = useRewardRevealStore((s) => s.cards)
  const close = useRewardRevealStore((s) => s.close)

  if (cards.length === 0) {
    return null
  }

  return <RevealGrid results={cards} onClose={close} />
}
