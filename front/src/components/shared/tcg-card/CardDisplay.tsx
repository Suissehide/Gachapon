import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'

import type { ElementKey, StatKey } from './config.ts'
import { TcgCardFace } from './TcgCardFace.tsx'

// ── Spring physics (simeydotme parameters) ────────────────────────────────────

type SpringState = {
  current: { rx: number; ry: number; scale: number }
  velocity: { rx: number; ry: number; scale: number }
  target: { rx: number; ry: number; scale: number }
  stiffness: number
  damping: number
  rafId: number | null
  isHovered: boolean
}

const SPRING_HOVER = { stiffness: 0.066, damping: 0.25 }
const SPRING_RETURN = { stiffness: 0.01, damping: 0.06 }

function makeSpring(): SpringState {
  return {
    current: { rx: 0, ry: 0, scale: 1 },
    velocity: { rx: 0, ry: 0, scale: 0 },
    target: { rx: 0, ry: 0, scale: 1 },
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
  /** Enables mouse tilt + cursor light. Keep false while a CSS entrance animation is running. */
  interactive?: boolean
  /** Use compact sizing — card fills its parent width with 2/3 aspect ratio instead of fixed 240×360. */
  compact?: boolean
  /** Use enlarged sizing (~320×480) instead of default 240×360. Ignored when `compact` is true. */
  large?: boolean
  /** CSS class for entrance animation (e.g. 'card-spiral-rise'). Pass empty string when done. */
  animClass?: string
  /** Changing this value remounts the card and restarts the animation. */
  animKey?: number
  onAnimationEnd?: () => void
  /** Optional back-face content for flip animations */
  backFace?: React.ReactNode
  // Forwarded to TcgCardFace
  level?: number | null
  stats?: Record<StatKey, number> | null
  element?: ElementKey | null
  description?: string | null
  artPosition?: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CardDisplay({
  rarity,
  name,
  setName,
  imageUrl,
  variant,
  isOwned = true,
  interactive = false,
  compact = false,
  large = false,
  animClass,
  animKey,
  onAnimationEnd,
  backFace,
  level,
  stats,
  element,
  description,
  artPosition,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const springRef = useRef<SpringState>(makeSpring())

  // Reset spring + shine when animKey changes (new card reveal)
  const prevAnimKey = useRef(animKey)
  if (prevAnimKey.current !== animKey) {
    prevAnimKey.current = animKey
    const s = springRef.current
    if (s.rafId !== null) {
      cancelAnimationFrame(s.rafId)
      s.rafId = null
    }
    s.current = { rx: 0, ry: 0, scale: 1 }
    s.velocity = { rx: 0, ry: 0, scale: 0 }
    s.target = { rx: 0, ry: 0, scale: 1 }
    s.isHovered = false
    cardRef.current?.style.setProperty('--shine-o', '0')
  }

  // Spring tick — runs until settled, then stops (not a continuous loop)
  const tick = useCallback((): void => {
    const s = springRef.current
    const card = cardRef.current
    if (!card) {
      s.rafId = null
      return
    }

    s.velocity.rx += (s.target.rx - s.current.rx) * s.stiffness
    s.velocity.ry += (s.target.ry - s.current.ry) * s.stiffness
    s.velocity.scale += (s.target.scale - s.current.scale) * s.stiffness
    s.velocity.rx *= 1 - s.damping
    s.velocity.ry *= 1 - s.damping
    s.velocity.scale *= 1 - s.damping
    s.current.rx += s.velocity.rx
    s.current.ry += s.velocity.ry
    s.current.scale += s.velocity.scale

    card.style.transform = `rotateY(${s.current.ry}deg) rotateX(${s.current.rx}deg) scale(${s.current.scale})`

    const settled =
      Math.abs(s.velocity.rx) < 0.005 &&
      Math.abs(s.velocity.ry) < 0.005 &&
      Math.abs(s.velocity.scale) < 0.001 &&
      Math.abs(s.current.rx - s.target.rx) < 0.01 &&
      Math.abs(s.current.ry - s.target.ry) < 0.01 &&
      Math.abs(s.current.scale - s.target.scale) < 0.001

    if (settled) {
      s.rafId = null
      if (!s.isHovered) {
        card.style.transform = ''
      }
    } else {
      s.rafId = requestAnimationFrame(tick)
    }
  }, [])

  // Cancel pending rAF on unmount
  useEffect(() => {
    return () => {
      const { rafId } = springRef.current
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) {
      return
    }
    const rect = cardRef.current.getBoundingClientRect()
    const percentX = (100 / rect.width) * (e.clientX - rect.left)
    const percentY = (100 / rect.height) * (e.clientY - rect.top)
    const cx = percentX - 50
    const cy = percentY - 50

    const s = springRef.current
    s.isHovered = true
    s.stiffness = SPRING_HOVER.stiffness
    s.damping = SPRING_HOVER.damping
    s.target.ry = -(cx / 3.5)
    s.target.rx = cy / 3.5
    s.target.scale = 1.04

    const card = cardRef.current
    card.style.setProperty('--shine-x', `${percentX}%`)
    card.style.setProperty('--shine-y', `${percentY}%`)
    card.style.setProperty('--shine-o', '1')

    if (!s.rafId) {
      s.rafId = requestAnimationFrame(tick)
    }
  }

  const handleMouseLeave = () => {
    if (!interactive) {
      return
    }
    const s = springRef.current
    s.isHovered = false
    s.stiffness = SPRING_RETURN.stiffness
    s.damping = SPRING_RETURN.damping
    s.target.rx = 0
    s.target.ry = 0
    s.target.scale = 1
    if (!s.rafId) {
      s.rafId = requestAnimationFrame(tick)
    }
    cardRef.current?.style.setProperty('--shine-o', '0')
  }

  const sizeClass = compact
    ? 'w-full aspect-[2/3]'
    : large
      ? 'h-[480px] w-80'
      : 'h-90 w-60'
  const hitboxClass = compact ? 'relative' : 'relative -m-10 p-10'
  const overlayRadius = compact ? 'rounded-[10px]' : 'rounded-[13px]'

  return (
    <div
      className={hitboxClass}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${sizeClass} perspective-[900px]`}>
        <div
          key={animKey}
          ref={cardRef}
          className={`w-full h-full transform-3d [transition:--shine-o_0.35s_ease] ${animClass ?? ''} ${interactive ? 'will-change-transform' : ''}`}
          onAnimationEnd={onAnimationEnd}
        >
          <div className="card-face absolute inset-0 [isolation:isolate]">
            <TcgCardFace
              rarity={rarity}
              name={name}
              setName={setName}
              imageUrl={imageUrl}
              variant={variant}
              isOwned={isOwned}
              compact={compact}
              level={level}
              stats={stats}
              element={element}
              description={description}
              artPosition={artPosition}
            />

            {interactive && (
              <>
                <div
                  className={`pointer-events-none absolute inset-0 z-[6] ${overlayRadius} mix-blend-overlay`}
                  style={{
                    opacity: 'var(--shine-o, 0)' as unknown as number,
                    background:
                      'radial-gradient(farthest-corner circle at var(--shine-x, 50%) var(--shine-y, 50%), hsla(0,0%,100%,0.8) 10%, hsla(0,0%,100%,0.65) 20%, hsla(0,0%,0%,0.5) 90%)',
                  }}
                />
                <div
                  className={`pointer-events-none absolute inset-0 z-[7] ${overlayRadius} mix-blend-screen`}
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
