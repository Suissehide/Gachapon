import { Award, Coins, Sparkles, Star, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  RARITY_FR,
  type UnlockedAchievement,
} from '../../constants/achievements.constant'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'

const DISPLAY_MS = 5000
const EXIT_MS = 350

export function AchievementUnlockToast() {
  const current = useAchievementUnlockStore((s) => s.queue[0])
  const popQueue = useAchievementUnlockStore((s) => s.dismiss)

  // `pending` holds the achievement currently rendered. We keep it after the
  // store has been popped so the exit animation can finish — only then do we
  // null it out and let the next item (if any) flow in.
  const [pending, setPending] = useState<UnlockedAchievement | null>(
    current ?? null,
  )
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startExit = useCallback(() => {
    if (phase === 'out') {
      return
    }
    setPhase('out')
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
      autoHideTimer.current = null
    }
    removeTimer.current = setTimeout(() => {
      popQueue()
      setPending(null)
      setPhase('in')
    }, EXIT_MS)
  }, [phase, popQueue])

  // When a new unlock arrives and nothing is on screen, swap it in.
  useEffect(() => {
    if (current && !pending) {
      setPending(current)
      setPhase('in')
    }
  }, [current, pending])

  // Auto-dismiss after DISPLAY_MS (resets on each fresh item).
  useEffect(() => {
    if (!pending || phase !== 'in') {
      return
    }
    autoHideTimer.current = setTimeout(startExit, DISPLAY_MS)
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    }
  }, [pending, phase, startExit])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
      if (removeTimer.current) {
        clearTimeout(removeTimer.current)
      }
    }
  }, [])

  if (!pending) {
    return null
  }

  const reward = pending.reward

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[200] flex justify-center px-4">
      <button
        type="button"
        onClick={startExit}
        aria-label="Fermer"
        className="group pointer-events-auto relative w-full max-w-md cursor-pointer border-0 bg-transparent p-0 text-left"
        style={{
          animation:
            phase === 'in'
              ? 'achievementToastDrop 450ms cubic-bezier(0.34, 1.4, 0.64, 1) both'
              : `achievementToastLift ${EXIT_MS}ms cubic-bezier(0.4, 0.0, 0.7, 0.3) forwards`,
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-300/40 px-6 py-5 shadow-[0_24px_64px_-16px_rgba(245,158,11,0.55)]"
          style={{
            background:
              'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ec4899 100%)',
          }}
        >
          {/* Decorative radial glow */}
          <div
            className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full opacity-50"
            style={{
              background:
                'radial-gradient(circle, rgba(253, 230, 138, 0.7), transparent 70%)',
            }}
          />

          {/* Close affordance — the parent button captures the click; the
              chip subtly brightens on hover for feedback. */}
          <span
            className="pointer-events-none absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/0 text-white/70 transition-colors duration-200 group-hover:bg-white/15 group-hover:text-white"
            aria-hidden
          >
            <X className="h-3.5 w-3.5" />
          </span>

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Award className="h-7 w-7 text-white drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-50/80">
                Succès débloqué
              </div>
              <div className="mt-1 font-display text-xl font-black leading-tight text-white drop-shadow">
                {pending.name}
              </div>
            </div>
          </div>

          {reward && (
            <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/25 pt-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-50/70">
                Récompense
              </span>
              {reward.tokens > 0 && (
                <span className="flex items-center gap-1 font-display text-base font-extrabold tabular-nums text-white">
                  <Coins className="h-3.5 w-3.5" />
                  {reward.tokens}
                </span>
              )}
              {reward.dust > 0 && (
                <span className="flex items-center gap-1 font-display text-base font-extrabold tabular-nums text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  {reward.dust}
                </span>
              )}
              {reward.xp > 0 && (
                <span className="flex items-center gap-1 font-display text-base font-extrabold tabular-nums text-white">
                  <Star className="h-3.5 w-3.5" />
                  {reward.xp}
                  <span className="ml-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-50/70">
                    XP
                  </span>
                </span>
              )}
              {reward.cardRarity && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                  + carte {RARITY_FR[reward.cardRarity] ?? reward.cardRarity}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
