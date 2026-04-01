import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'

import { TcgCardFace } from './TcgCardFace.tsx'

// ── Spring physics (simeydotme parameters) ────────────────────────────────────

type SpringState = {
  current:  { rx: number; ry: number; scale: number }
  velocity: { rx: number; ry: number; scale: number }
  target:   { rx: number; ry: number; scale: number }
  stiffness: number
  damping:   number
  rafId:    number | null
  isHovered: boolean
}

const SPRING_HOVER  = { stiffness: 0.066, damping: 0.25 }
const SPRING_RETURN = { stiffness: 0.01,  damping: 0.06  }

function makeSpring(): SpringState {
  return {
    current:  { rx: 0, ry: 0, scale: 1 },
    velocity: { rx: 0, ry: 0, scale: 0 },
    target:   { rx: 0, ry: 0, scale: 1 },
    ...SPRING_HOVER,
    rafId: null,
    isHovered: false,
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  rarity: string
  name: string
  setName: string
  imageUrl?: string | null
  variant?: string | null
  isOwned?: boolean
  showSweep?: boolean
  /** Enables mouse tilt + cursor light. Keep false while a CSS entrance animation is running. */
  interactive?: boolean
  /** CSS class for entrance animation (e.g. 'card-spiral-rise'). Pass empty string when done. */
  animClass?: string
  /** Changing this value remounts the card and restarts the animation. */
  animKey?: number
  onAnimationEnd?: () => void
  /** Optional back-face content for flip animations */
  backFace?: React.ReactNode
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CardDisplay({
  rarity,
  name,
  setName,
  imageUrl,
  variant,
  isOwned = true,
  showSweep = false,
  interactive = false,
  animClass,
  animKey,
  onAnimationEnd,
  backFace,
}: Props) {
  const cardRef   = useRef<HTMLDivElement>(null)
  const springRef = useRef<SpringState>(makeSpring())

  // Reset spring + shine when animKey changes (new card reveal)
  const prevAnimKey = useRef(animKey)
  if (prevAnimKey.current !== animKey) {
    prevAnimKey.current = animKey
    const s = springRef.current
    if (s.rafId !== null) { cancelAnimationFrame(s.rafId); s.rafId = null }
    s.current   = { rx: 0, ry: 0, scale: 1 }
    s.velocity  = { rx: 0, ry: 0, scale: 0 }
    s.target    = { rx: 0, ry: 0, scale: 1 }
    s.isHovered = false
    cardRef.current?.style.setProperty('--shine-o', '0')
  }

  // Spring tick — runs until settled, then stops (not a continuous loop)
  const tick = useCallback((): void => {
    const s    = springRef.current
    const card = cardRef.current
    if (!card) { s.rafId = null; return }

    s.velocity.rx    += (s.target.rx    - s.current.rx)    * s.stiffness
    s.velocity.ry    += (s.target.ry    - s.current.ry)    * s.stiffness
    s.velocity.scale += (s.target.scale - s.current.scale) * s.stiffness
    s.velocity.rx    *= (1 - s.damping)
    s.velocity.ry    *= (1 - s.damping)
    s.velocity.scale *= (1 - s.damping)
    s.current.rx    += s.velocity.rx
    s.current.ry    += s.velocity.ry
    s.current.scale += s.velocity.scale

    card.style.transform =
      `rotateY(${s.current.ry}deg) rotateX(${s.current.rx}deg) scale(${s.current.scale})`

    const settled =
      Math.abs(s.velocity.rx)    < 0.005 &&
      Math.abs(s.velocity.ry)    < 0.005 &&
      Math.abs(s.velocity.scale) < 0.001 &&
      Math.abs(s.current.rx    - s.target.rx)    < 0.01  &&
      Math.abs(s.current.ry    - s.target.ry)    < 0.01  &&
      Math.abs(s.current.scale - s.target.scale) < 0.001

    if (settled) {
      s.rafId = null
      if (!s.isHovered) card.style.transform = ''
    } else {
      s.rafId = requestAnimationFrame(tick)
    }
  }, [])

  // Cancel pending rAF on unmount
  useEffect(() => {
    return () => {
      const { rafId } = springRef.current
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const percentX = (100 / rect.width)  * (e.clientX - rect.left)
    const percentY = (100 / rect.height) * (e.clientY - rect.top)
    const cx = percentX - 50  // -50 … +50
    const cy = percentY - 50

    const s = springRef.current
    s.isHovered    = true
    s.stiffness    = SPRING_HOVER.stiffness
    s.damping      = SPRING_HOVER.damping
    // simeydotme formula: X mouse → rotateY, Y mouse → rotateX, ÷3.5 ≈ ±14° max
    s.target.ry    = -(cx / 3.5)
    s.target.rx    =   cy / 3.5
    s.target.scale = 1.04

    const card = cardRef.current
    card.style.setProperty('--shine-x', `${percentX}%`)
    card.style.setProperty('--shine-y', `${percentY}%`)
    card.style.setProperty('--shine-o', '1')

    if (!s.rafId) s.rafId = requestAnimationFrame(tick)
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    const s = springRef.current
    s.isHovered    = false
    s.stiffness    = SPRING_RETURN.stiffness  // slow, wobbly return
    s.damping      = SPRING_RETURN.damping
    s.target.rx    = 0
    s.target.ry    = 0
    s.target.scale = 1
    if (!s.rafId) s.rafId = requestAnimationFrame(tick)

    cardRef.current?.style.setProperty('--shine-o', '0')
  }

  return (
    // Extended hitbox — prevents mouseleave firing when a tilted corner drifts outside card bounds
    <div
      className="relative -m-10 p-10"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-90 w-60 perspective-[900px]">
        <div
          key={animKey}
          ref={cardRef}
          className={`w-full h-full transform-3d [transition:--shine-o_0.35s_ease] ${animClass ?? ''} ${interactive ? 'will-change-transform' : ''}`}
          onAnimationEnd={onAnimationEnd}
        >
          {/*
           * card-face wraps TcgCardFace + cursor light overlays.
           * [isolation:isolate] contains mix-blend-mode so overlay shine only
           * blends with the card's own pixels, not the page background.
           */}
          <div className="card-face absolute inset-0 [isolation:isolate]">
            <TcgCardFace
              rarity={rarity}
              name={name}
              setName={setName}
              imageUrl={imageUrl}
              variant={variant}
              isOwned={isOwned}
              showSweep={showSweep}
            />

            {interactive && (
              <>
                {/*
                 * Glare — exact simeydotme technique:
                 *   bright white center (0.8) → white ring (0.65) → dark edges (black 0.5 at 90%)
                 *   + mix-blend-mode: overlay
                 * The dark edge/bright center contrast is what makes the effect visible and dramatic.
                 * White areas brightens the card, black areas darkens it → clear flashlight look.
                 */}
                <div
                  className="pointer-events-none absolute inset-0 z-[6] rounded-[7px] mix-blend-overlay"
                  style={{
                    opacity: 'var(--shine-o, 0)' as unknown as number,
                    background:
                      'radial-gradient(farthest-corner circle at var(--shine-x, 50%) var(--shine-y, 50%), hsla(0,0%,100%,0.8) 10%, hsla(0,0%,100%,0.65) 20%, hsla(0,0%,0%,0.5) 90%)',
                  }}
                />
                {/*
                 * Subtle screen glow on top — adds a soft warm halo around cursor.
                 */}
                <div
                  className="pointer-events-none absolute inset-0 z-[7] rounded-[7px] mix-blend-screen"
                  style={{
                    opacity: 'var(--shine-o, 0)' as unknown as number,
                    background:
                      'radial-gradient(circle 40% at var(--shine-x, 50%) var(--shine-y, 50%), rgba(255,255,255,0.15) 0%, transparent 70%)',
                  }}
                />
              </>
            )}
          </div>

          {backFace && (
            <div className="card-face-back absolute inset-0">{backFace}</div>
          )}
        </div>
      </div>
    </div>
  )
}
