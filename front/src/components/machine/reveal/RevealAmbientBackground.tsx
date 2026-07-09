// front/src/components/machine/reveal/RevealAmbientBackground.tsx
import { type CSSProperties, useEffect, useRef } from 'react'

import type { CardRarity } from '../../../constants/card.constant'
import { getRarityTone } from '../../shared/tcg-card/config'
import {
  AMBIENT_CONFIG,
  type AmbientConfig,
  PARTICLE_COLORS,
} from './rarityConfig'

type Props = { rarity: CardRarity | null }

// Baseline neutre violet-nuit avant tout flip (rarity === null).
const BASELINE: AmbientConfig = {
  auraIntensity: 0.05,
  rays: false,
  particleCount: 10,
  particleSpeed: 0.22,
  particleSize: [2, 4],
  glow: 0,
}
const BASELINE_COLOR = '#5b4b82'
const BASELINE_PARTICLE_COLORS = ['#4c3f6b', '#6d5ea8', '#c4b5fd']

function resolveConfig(rarity: CardRarity | null): AmbientConfig {
  return rarity ? AMBIENT_CONFIG[rarity] : BASELINE
}

function resolveAuraColor(rarity: CardRarity | null): string {
  return rarity ? getRarityTone(rarity).hex : BASELINE_COLOR
}

function resolveParticleColors(rarity: CardRarity | null): string[] {
  if (!rarity) {
    return BASELINE_PARTICLE_COLORS
  }
  const key = rarity.toLowerCase() as keyof typeof PARTICLE_COLORS
  const palette = PARTICLE_COLORS[key]
  if (palette) {
    return palette
  }
  // COMMON n'a pas de palette dans PARTICLE_COLORS → dérive du ton.
  const tone = getRarityTone(rarity)
  return [tone.hex, tone.light, '#ffffff']
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  col: string
  alpha: number
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function RevealAmbientBackground({ rarity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  // Rareté courante lue par la boucle RAF sans la relancer.
  const rarityRef = useRef<CardRarity | null>(rarity)
  rarityRef.current = rarity

  useEffect(() => {
    if (prefersReducedMotion()) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const resize = () => {
      const parent = canvas.parentElement
      canvas.width = parent?.clientWidth ?? window.innerWidth
      canvas.height = parent?.clientHeight ?? window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const spawn = (atBottom: boolean): Particle => {
      const current = rarityRef.current
      const cfg = resolveConfig(current)
      const colors = resolveParticleColors(current)
      const [smin, smax] = cfg.particleSize
      return {
        x: rand(0, canvas.width),
        y: atBottom ? canvas.height + rand(0, 40) : rand(0, canvas.height),
        vx: rand(-0.15, 0.15),
        vy: -cfg.particleSpeed * rand(0.6, 1.4),
        size: rand(smin, smax),
        col: colors[Math.floor(Math.random() * colors.length)],
        alpha: rand(0.3, 0.9),
      }
    }

    const tick = () => {
      const cfg = resolveConfig(rarityRef.current)
      const ps = particlesRef.current
      // best-of-lot ne fait que monter → on ne fait que croître vers la cible.
      while (ps.length < cfg.particleCount) {
        ps.push(spawn(false))
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.shadowBlur = cfg.glow
      for (const p of ps) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -p.size) {
          // respawn en bas avec la palette courante (transition douce des couleurs).
          Object.assign(p, spawn(true))
        }
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.col
        ctx.shadowColor = p.col
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      rafRef.current = requestAnimationFrame(tick)
    }

    const start = () => {
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    const stop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        start()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    start()
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const auraColor = resolveAuraColor(rarity)
  const cfg = resolveConfig(rarity)

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Aura radiale — couleur + opacité en transition douce (crescendo). */}
      <div
        className="absolute inset-0 transition-[background,opacity] duration-[800ms] ease-out"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${auraColor}, transparent 62%)`,
          opacity: cfg.auraIntensity,
        }}
      />
      {/* God-rays — conic en rotation lente, masqué en fondu radial. */}
      {cfg.rays && (
        <div
          className="absolute left-1/2 top-[45%] aspect-square w-[140vmax] animate-[ambientSpin_90s_linear_infinite] transition-opacity duration-[800ms]"
          style={
            {
              // Sunburst : un rayon doux répété tous les 30° → 12 rayons
              // répartis sur tout le cercle (le conic simple ne couvrait qu'un
              // arc de 0→60°, d'où l'impression d'un seul rayon).
              background: `repeating-conic-gradient(from 0deg, transparent 0deg, ${auraColor}55 5deg, transparent 11deg, transparent 30deg)`,
              maskImage:
                'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, transparent 60%)',
              WebkitMaskImage:
                'radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, transparent 60%)',
              opacity: cfg.auraIntensity * 0.6,
            } as CSSProperties
          }
        />
      )}
      {/* Particules flottantes. */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
