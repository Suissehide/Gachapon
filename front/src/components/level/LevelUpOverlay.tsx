import { Coins, Star, Zap } from 'lucide-react'
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
  id: i,
  angle: (i / PARTICLE_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.4,
  dist: 80 + Math.random() * 60,
  size: 6 + Math.random() * 4,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  delay: 400 + Math.random() * 150,
}))

export function LevelUpOverlay() {
  const level = useLevelUpStore((s) => s.level)
  const reward = useLevelUpStore((s) => s.reward)
  const dismiss = useLevelUpStore((s) => s.dismiss)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (level === null) { return }

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

  if (level === null) { return null }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Niveau supérieur"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        animation: fadingOut
          ? `levelUpFadeOut ${FADE_OUT_MS}ms ease-out forwards`
          : `levelUpBackdropIn 300ms ease-out forwards`,
      }}
    >
      {/* Clickable backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/50"
        onClick={dismiss}
      />

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

        {/* Reward section */}
        {reward !== null && reward.skillPoints > 0 && (
          <div
            className="flex flex-col items-center gap-2"
            style={{
              animation: 'levelUpTextPop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 450ms both',
            }}
          >
            {/* Skill points */}
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 ring-1 ring-amber-400/40">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-sm font-bold text-amber-200">
                +{reward.skillPoints} point{reward.skillPoints > 1 ? 's' : ''} de compétence
              </span>
            </div>

            {/* Milestone packs */}
            {reward.milestones.map((m) => (
              <div
                key={m.level}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/20"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  Palier {m.level} !
                </span>
                <div className="flex items-center gap-3 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-400" />
                    {m.tokens} jetons
                  </span>
                  <span className="text-white/40">·</span>
                  <span>{m.dust} poussière</span>
                  {m.bonusPoints > 0 && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="font-semibold text-amber-200">
                        +{m.bonusPoints} points bonus
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
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
