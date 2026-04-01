import { Sparkles, Star, Ticket } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Particle {
  id: number
  type: 'token' | 'dust' | 'xp'
  tx: number
  ty: number
  delay: number
}

interface ClaimParticlesProps {
  burst: boolean
  originX: number
  originY: number
  hasTokens: boolean
  hasDust: boolean
  hasXp: boolean
}

const PER_TYPE = 12

function buildParticles(types: Array<'token' | 'dust' | 'xp'>): Particle[] {
  const total = types.length * PER_TYPE
  return types.flatMap((type, ti) =>
    Array.from({ length: PER_TYPE }, (_, i) => {
      const base = ((ti * PER_TYPE + i) / total) * 2 * Math.PI
      const angle = base + (Math.random() - 0.5) * 0.5
      const dist = 60 + Math.random() * 70
      return {
        id: ti * PER_TYPE + i,
        type,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: Math.random() * 60,
      }
    }),
  )
}

const ICON: Record<Particle['type'], ReactNode> = {
  token: <Ticket className="h-3 w-3 text-primary" />,
  dust: <Sparkles className="h-3 w-3 text-accent" />,
  xp: <Star className="h-3 w-3 text-yellow-400" />,
}

export function ClaimParticles({
  burst,
  originX,
  originY,
  hasTokens,
  hasDust,
  hasXp,
}: ClaimParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!burst) {
      return
    }

    const types: Array<'token' | 'dust' | 'xp'> = []
    if (hasTokens) {
      types.push('token')
    }
    if (hasDust) {
      types.push('dust')
    }
    if (hasXp) {
      types.push('xp')
    }
    if (types.length === 0) {
      return
    }

    setParticles(buildParticles(types))
    const t = setTimeout(() => setParticles([]), 1000)
    return () => clearTimeout(t)
  }, [burst, hasTokens, hasDust, hasXp])

  if (!particles.length) {
    return null
  }

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ left: originX, top: originY }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              animation: `claimParticle 800ms ease-out ${p.delay}ms forwards`,
            } as CSSProperties
          }
        >
          {ICON[p.type]}
        </div>
      ))}
    </div>,
    document.body,
  )
}
