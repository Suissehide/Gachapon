import { Award } from 'lucide-react'
import { useEffect } from 'react'
import { useAchievementUnlockStore } from '../../stores/achievementUnlock.store'

const DISPLAY_MS = 2500

export function AchievementUnlockToast() {
  const current = useAchievementUnlockStore((s) => s.queue[0])
  const dismiss = useAchievementUnlockStore((s) => s.dismiss)

  useEffect(() => {
    if (!current) return
    const t = setTimeout(dismiss, DISPLAY_MS)
    return () => clearTimeout(t)
  }, [current, dismiss])

  if (!current) return null

  return (
    <div
      className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
      style={{ animation: 'achievementToastIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      onClick={dismiss}
    >
      <div className="flex items-center gap-3 rounded-md border border-amber-400/40 bg-gradient-to-br from-amber-500/95 to-amber-700/95 px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.4)]">
        <div className="rounded-full bg-amber-200/30 p-2">
          <Award className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-100/80">
            Succès débloqué
          </span>
          <span className="text-sm font-black text-white drop-shadow">
            {current.name}
          </span>
        </div>
      </div>
    </div>
  )
}
