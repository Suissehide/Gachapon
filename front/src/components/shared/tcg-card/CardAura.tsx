import type { CSSProperties } from 'react'

import { getRarityTone } from './config.ts'

type Props = {
  rarity: string
  variant?: string | null
  /** 'large' bumps particle count + glow for the big inspect card. */
  intensity?: 'grid' | 'large'
}

// Rarities that earn an aura on their own (variants always qualify).
const RARITY_STRENGTH: Record<string, number> = {
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
}

const GOLD_COLORS = ['#fde68a', '#fcd34d', '#f59e0b']
const HOLO_COLORS = ['#22d3ee', '#a855f7', '#f59e0b', '#ec4899', '#38bdf8']

const HOLO_GRADIENT =
  'conic-gradient(from 0deg, #22d3ee, #a855f7, #f59e0b, #ec4899, #38bdf8, #22d3ee)'
const GOLD_GRADIENT =
  'conic-gradient(from 0deg, #fbbf24, #fde68a, #f59e0b, #b45309, #fde68a, #fbbf24)'

// Each particle spawns just *inside* one edge (behind the opaque face) and
// drifts outward past that edge, so it reads as emerging from behind the card.
function makeParticles(count: number, large: boolean, colors: string[]) {
  const risePx = large ? 64 : 40
  const driftPx = large ? 42 : 24
  const IN = 5 // % inside the edge, hidden behind the face at spawn
  return Array.from({ length: count }, (_, i) => {
    const edge = i % 4 // 0 top · 1 right · 2 bottom · 3 left
    const along = (i * 0.618_033_988_75) % 1 // golden-ratio spread, deterministic
    let left: number
    let top: number
    let dx: number
    let dy: number
    if (edge === 0) {
      left = 6 + along * 88
      top = IN
      dx = Math.round((left - 50) * 0.3)
      dy = -risePx
    } else if (edge === 1) {
      left = 100 - IN
      top = 8 + along * 84
      dx = driftPx
      dy = -Math.round(risePx * 0.4)
    } else if (edge === 2) {
      left = 6 + along * 88
      top = 100 - IN
      dx = Math.round((left - 50) * 0.3)
      dy = Math.round(risePx * 0.7)
    } else {
      left = IN
      top = 8 + along * 84
      dx = -driftPx
      dy = -Math.round(risePx * 0.4)
    }
    const size = (large ? 4 : 3) + (i % 3)
    const delay = (i / count) * 2.2
    const duration = 2.6 + ((i * 17) % 14) / 10
    return {
      i,
      left,
      top,
      size,
      dx,
      dy,
      delay,
      duration,
      color: colors[i % colors.length],
    }
  })
}

type Tone = ReturnType<typeof getRarityTone>

function resolvePalette(isBrilliant: boolean, isHolo: boolean, tone: Tone) {
  if (isBrilliant) {
    return { particleColors: GOLD_COLORS, haloColor: '#f59e0b' }
  }
  if (isHolo) {
    return { particleColors: HOLO_COLORS, haloColor: '#a855f7' }
  }
  return {
    particleColors: [tone.hex, tone.light, '#ffffff'],
    haloColor: tone.hex,
  }
}

/** Halo behind the card: a living gold/prismatic blob for variants, else a
 *  soft rarity-colored glow. */
function AuraHalo({
  isVariant,
  isHolo,
  haloColor,
  haloOpacity,
  large,
}: {
  isVariant: boolean
  isHolo: boolean
  haloColor: string
  haloOpacity: number
  large: boolean
}) {
  if (isVariant) {
    return (
      <div
        className="absolute -inset-[18%]"
        style={
          {
            filter: `blur(${large ? 34 : 22}px)`,
            '--aura-halo-opacity': haloOpacity,
            animation: 'cardAuraPulse 3.4s ease-in-out infinite',
          } as CSSProperties
        }
      >
        <div
          className="absolute inset-0"
          style={{
            background: isHolo ? HOLO_GRADIENT : GOLD_GRADIENT,
            animation: isHolo
              ? 'cardAuraBlob 9s ease-in-out infinite, cardAuraHue 6s linear infinite'
              : 'cardAuraBlob 9s ease-in-out infinite, cardAuraShimmer 3.2s ease-in-out infinite',
          }}
        />
      </div>
    )
  }
  return (
    <div
      className="absolute -inset-[14%] rounded-[30%]"
      style={
        {
          background: `radial-gradient(closest-side, ${haloColor} 0%, transparent 72%)`,
          filter: `blur(${large ? 32 : 20}px)`,
          '--aura-halo-opacity': haloOpacity,
          animation: 'cardAuraPulse 3.4s ease-in-out infinite',
        } as CSSProperties
      }
    />
  )
}

/**
 * Persistent glow + drifting particles rendered *behind* the card (follows the
 * tilt, sits under the opaque face so particles read as emerging from behind).
 * Renders nothing for cards that don't qualify. CSS-only — cheap enough to run
 * on several reveal cards at once.
 */
export function CardAura({ rarity, variant, intensity = 'grid' }: Props) {
  const isBrilliant = variant === 'BRILLIANT'
  const isHolo = variant === 'HOLOGRAPHIC'
  const isVariant = isBrilliant || isHolo
  const rarityStrength = RARITY_STRENGTH[rarity] ?? 0
  const strength = Math.max(rarityStrength, isVariant ? 2 : 0)
  if (strength === 0) {
    return null
  }

  const tone = getRarityTone(rarity)
  const large = intensity === 'large'
  const { particleColors, haloColor } = resolvePalette(
    isBrilliant,
    isHolo,
    tone,
  )

  const count = Math.round(
    (5 + strength * 2 + (isVariant ? 5 : 0)) * (large ? 1.8 : 1),
  )
  const haloOpacity = Math.min(0.7, 0.3 + strength * 0.12 + (large ? 0.08 : 0))

  const particles = makeParticles(count, large, particleColors)

  return (
    <div
      className="pointer-events-none absolute inset-0 animate-[fadeIn_500ms_ease-out]"
      aria-hidden="true"
    >
      <AuraHalo
        isVariant={isVariant}
        isHolo={isHolo}
        haloColor={haloColor}
        haloOpacity={haloOpacity}
        large={large}
      />
      {particles.map((p) => (
        <span
          key={p.i}
          className="absolute rounded-full"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              '--aura-dx': `${p.dx}px`,
              '--aura-dy': `${p.dy}px`,
              animation: `cardAuraRise ${p.duration}s ease-out ${p.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
