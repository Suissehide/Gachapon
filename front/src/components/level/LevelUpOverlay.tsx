import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useLevelUpStore } from '../../stores/levelUp.store.ts'

const PARTICLE_COUNT = 12
const DISPLAY_MS = 3000
const FADE_OUT_MS = 500

const PARTICLE_COLORS = [
  '#FFD700',
  '#FFC107',
  '#FFE066',
  '#FFFFFF',
  '#FFD700',
  '#FFC107',
  '#FFE066',
  '#FFD700',
  '#FFFFFF',
  '#FFC107',
  '#FFD700',
  '#FFE066',
]

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  angle: (i / PARTICLE_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.4,
  dist: 80 + Math.random() * 60,
  size: 6 + Math.random() * 4,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  delay: 400 + Math.random() * 150,
}))

export function LevelUpOverlay() {
  const level = useLevelUpStore((s) => s.level)
  const dismiss = useLevelUpStore((s) => s.dismiss)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (level === null) return

    setFadingOut(false)

    const fadeTimer = setTimeout(() => setFadingOut(true), DISPLAY_MS - FADE_OUT_MS)
    const dismissTimer = setTimeout(() => {
      dismiss()
      setFadingOut(false)
    }, DISPLAY_MS)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(dismissTimer)
    }
  }, [level, dismiss])

  if (level === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        animation: fadingOut
          ? `levelUpFadeOut ${FADE_OUT_MS}ms ease-out forwards`
          : `levelUpBackdropIn 300ms ease-out forwards`,
      }}
      onClick={dismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-3">
        {/* Star icon */}
        <div
          className="flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 p-4 shadow-lg shadow-amber-500/30"
          style={{
            animation: 'levelUpStarBounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both',
          }}
        >
          <Star className="h-8 w-8 fill-white text-white" />
        </div>

        {/* Level text */}
        <div
          className="flex flex-col items-center gap-1"
          style={{
            animation: 'levelUpTextPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms both',
          }}
        >
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200">
            Niveau supérieur
          </span>
          <span className="text-5xl font-black tabular-nums text-white drop-shadow-[0_2px_12px_rgba(255,215,0,0.5)]">
            {level}
          </span>
        </div>

        {/* Particles */}
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              '--angle': `${p.angle}rad`,
              '--dist': `${p.dist}px`,
              animation: `levelUpParticle 800ms ease-out ${p.delay}ms both`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
