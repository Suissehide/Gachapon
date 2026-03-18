import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import cardBackImg from '../../assets/data/card-back/black.png'
import placeholderImg from '../../assets/data/temp.png'
import type { PullResult } from '../../queries/useGacha'
import { Button } from '../ui/button.tsx'

// ── Rarity config ─────────────────────────────────────────────────────────────

const RARITY_CONFIG = {
  COMMON: {
    border: '#4b5563',
    glow: '',
    backdropColor: '',
    hasSweep: false,
    label: 'Commun',
    labelColor: '#9ca3af',
    labelBg: 'rgba(75,85,99,0.3)',
    nameClass: 'text-text',
  },
  UNCOMMON: {
    border: '#22c55e88',
    glow: '0 0 18px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2)',
    backdropColor: '',
    hasSweep: false,
    label: 'Peu commun',
    labelColor: '#4ade80',
    labelBg: 'rgba(34,197,94,0.15)',
    nameClass: 'text-green-400',
  },
  RARE: {
    border: '#06b6d4aa',
    glow: '0 0 22px rgba(6,182,212,0.6), 0 0 50px rgba(6,182,212,0.22)',
    backdropColor:
      'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(6,182,212,0.09) 0%, transparent 70%)',
    hasSweep: true,
    label: 'Rare',
    labelColor: '#22d3ee',
    labelBg: 'rgba(6,182,212,0.15)',
    nameClass: 'text-cyan-400',
  },
  EPIC: {
    border: '#8b5cf6aa',
    glow: '0 0 26px rgba(139,92,246,0.65), 0 0 60px rgba(139,92,246,0.25)',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(139,92,246,0.11) 0%, transparent 70%)',
    hasSweep: true,
    label: 'Épique',
    labelColor: '#a78bfa',
    labelBg: 'rgba(139,92,246,0.15)',
    nameClass: 'text-violet-400',
  },
  LEGENDARY: {
    border: '#f59e0bbb',
    glow: '0 0 30px rgba(245,158,11,0.75), 0 0 70px rgba(245,158,11,0.3), 0 0 120px rgba(245,158,11,0.12)',
    backdropColor:
      'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)',
    hasSweep: true,
    label: '✦ Légendaire ✦',
    labelColor: '#fbbf24',
    labelBg: 'rgba(245,158,11,0.18)',
    nameClass: 'legendary-text',
  },
} as const

const VARIANT_CONFIG = {
  BRILLIANT: {
    label: '✨ Brillant',
    className: 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
  },
  HOLOGRAPHIC: {
    label: '🌈 Holographique',
    className: 'bg-purple-500/10 border border-purple-500/30 text-purple-300',
  },
} as const

// Fixed particle positions for LEGENDARY
const LEGENDARY_PARTICLES = [
  { left: '8%', top: '20%', size: 4, delay: '0s', duration: '2.1s' },
  { left: '88%', top: '12%', size: 3, delay: '0.35s', duration: '1.8s' },
  { left: '75%', top: '78%', size: 5, delay: '0.7s', duration: '2.3s' },
  { left: '18%', top: '68%', size: 3, delay: '0.15s', duration: '1.6s' },
  { left: '48%', top: '5%', size: 4, delay: '0.9s', duration: '2s' },
  { left: '92%', top: '48%', size: 3, delay: '0.5s', duration: '1.75s' },
  { left: '12%', top: '88%', size: 5, delay: '1.1s', duration: '2.15s' },
  { left: '62%', top: '22%', size: 3, delay: '0.25s', duration: '1.65s' },
  { left: '33%', top: '90%', size: 4, delay: '0.8s', duration: '1.9s' },
  { left: '82%', top: '62%', size: 3, delay: '0.45s', duration: '2.05s' },
]

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  result: PullResult | null
  onClose: () => void
}

export function CardReveal({ result, onClose }: Props) {
  const [rotY, setRotY] = useState(180) // starts showing back
  const [isDragging, setIsDragging] = useState(false)
  const [showSweep, setShowSweep] = useState(false)
  const dragRef = useRef({ startX: 0, startRotY: 180 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!result) {
      setRotY(180)
      setShowSweep(false)
      return
    }
    // Short delay then flip to front
    const flipTimer = setTimeout(() => setRotY(0), 120)
    // Light sweep after flip completes (~120 + 800ms transition)
    const sweepTimer = setTimeout(() => setShowSweep(true), 950)
    return () => {
      clearTimeout(flipTimer)
      clearTimeout(sweepTimer)
    }
  }, [result])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const startDrag = (clientX: number) => {
    setIsDragging(true)
    dragRef.current = { startX: clientX, startRotY: rotY }
  }

  const moveDrag = (clientX: number) => {
    if (!isDragging) {
      return
    }
    const delta = (clientX - dragRef.current.startX) * 0.55
    setRotY(dragRef.current.startRotY - delta)
  }

  const endDrag = () => setIsDragging(false)

  if (!result) {
    return null
  }

  const rarity = result.card.rarity as keyof typeof RARITY_CONFIG
  const config = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.COMMON
  const isLegendary = rarity === 'LEGENDARY'

  // Front-face darkness: show text only when card is showing front (~rotY within ±90°)
  const showingFront =
    Math.abs(((rotY % 360) + 360) % 360) < 90 ||
    Math.abs(((rotY % 360) + 360) % 360) > 270

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
    >
      {/* Rarity backdrop glow */}
      {config.backdropColor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: config.backdropColor }}
        />
      )}

      {/* LEGENDARY flash */}
      {isLegendary && (
        <div className="legendary-flash pointer-events-none absolute inset-0 bg-primary/15" />
      )}

      {/* LEGENDARY particles */}
      {isLegendary &&
        LEGENDARY_PARTICLES.map((p, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static fixed array
            key={i}
            className="particle pointer-events-none absolute rounded-full bg-primary"
            style={
              {
                width: p.size,
                height: p.size,
                left: p.left,
                top: p.top,
                '--delay': p.delay,
                '--duration': p.duration,
              } as React.CSSProperties
            }
          />
        ))}

      {/* ── Slide-in container ── */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        ref={containerRef}
        className="card-slide-in flex flex-col items-center gap-5 px-4 py-8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* ── 3D Card ── */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handler */}
        <div
          className="select-none cursor-grab active:cursor-grabbing"
          style={{ perspective: '900px', width: '240px', height: '360px' }}
          onMouseDown={(e) => startDrag(e.clientX)}
          onMouseMove={(e) => moveDrag(e.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => startDrag(e.touches[0].clientX)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
          onTouchEnd={endDrag}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              transform: `rotateY(${rotY}deg)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* ── FRONT face ── */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                border: `2px solid ${config.border}`,
                boxShadow: config.glow,
              }}
            >
              {/* Card image */}
              <img
                src={result.card.imageUrl || placeholderImg}
                alt={result.card.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = placeholderImg
                }}
              />

              {/* Gradient overlay for text legibility */}
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/15 to-transparent" />

              {/* Light sweep (RARE / EPIC / LEGENDARY) */}
              {showSweep && config.hasSweep && (
                <div className="card-sweep-inner" />
              )}

              {/* Bottom info overlay */}
              {showingFront && (
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold mb-2"
                    style={{
                      color: config.labelColor,
                      background: config.labelBg,
                    }}
                  >
                    {config.label}
                  </span>
                  <h2
                    className={`text-lg font-black leading-tight ${config.nameClass}`}
                  >
                    {result.card.name}
                  </h2>
                </div>
              )}
            </div>

            {/* ── BACK face ── */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden border border-border/40"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <img
                src={cardBackImg}
                alt="dos de carte"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ── Info section below card ── */}
        <div className="w-60 rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-4 space-y-3">
          {/* Set name */}
          <p className="text-center text-xs font-medium text-text-light">
            {result.card.set.name}
          </p>

          {/* Variant */}
          {result.card.variant && (
            <span
              className={`block text-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                VARIANT_CONFIG[
                  result.card.variant as keyof typeof VARIANT_CONFIG
                ]?.className ?? ''
              }`}
            >
              {
                VARIANT_CONFIG[
                  result.card.variant as keyof typeof VARIANT_CONFIG
                ]?.label
              }
            </span>
          )}

          {/* Duplicate / dust */}
          {result.wasDuplicate && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2">
              <p className="text-center text-xs font-semibold text-amber-400">
                Doublon — +{result.dustEarned} ✨ poussière
              </p>
            </div>
          )}

          {/* Tokens remaining */}
          <p className="text-center text-xs text-text-light/60">
            {result.tokensRemaining} token
            {result.tokensRemaining !== 1 ? 's' : ''} restant
            {result.tokensRemaining !== 1 ? 's' : ''}
          </p>

          <Button className="w-full" onClick={onClose}>
            Continuer
          </Button>
        </div>

        {/* Hint */}
        <p className="text-xs text-text-light/35">
          Glisse la carte pour la faire pivoter
        </p>
      </div>
    </div>
  )
}
