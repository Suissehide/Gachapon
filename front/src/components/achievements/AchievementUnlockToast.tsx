import { Award, Coins, Sparkles, Star, X } from 'lucide-react'
import { useEffect } from 'react'

import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'

const DISPLAY_MS = 5000

export function AchievementUnlockToast() {
  const current = useAchievementUnlockStore((s) => s.queue[0])
  const dismiss = useAchievementUnlockStore((s) => s.dismiss)

  useEffect(() => {
    if (!current) {
      return
    }
    const t = setTimeout(dismiss, DISPLAY_MS)
    return () => clearTimeout(t)
  }, [current, dismiss])

  if (!current) {
    return null
  }

  const reward = current.reward

  return (
    // Overlay positions the card dead-center over the viewport.
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="pointer-events-auto relative w-full max-w-md cursor-pointer border-0 bg-transparent p-0 text-left"
        style={{
          animation:
            'achievementToastIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
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
          <X className="absolute right-3 top-3 h-4 w-4 text-white/60" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Award className="h-7 w-7 text-white drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-amber-50/80">
                Succès débloqué
              </div>
              <div className="mt-1 font-display text-xl font-black leading-tight text-white drop-shadow">
                {current.name}
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
                  + carte {reward.cardRarity}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
