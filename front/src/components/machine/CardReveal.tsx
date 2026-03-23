import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import cardBackImg from '../../assets/data/card-back/black.png'
import type { PullResult } from '../../queries/useGacha'
import { RARITY_TCG_CONFIG } from '../shared/tcg-card/config.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'

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
    const flipTimer = setTimeout(() => setRotY(0), 120)
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

  const rarity = result.card.rarity
  const config = RARITY_TCG_CONFIG[rarity] ?? RARITY_TCG_CONFIG.COMMON
  const isLegendary = rarity === 'LEGENDARY'
  const variant = result.card.variant ?? null

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
            {/* ── FRONT face — TCG layout ── */}
            <TcgCardFace
              rarity={rarity}
              name={result.card.name}
              setName={result.card.set.name}
              imageUrl={result.card.imageUrl}
              variant={variant}
              showSweep={showSweep}
            />

            {/* ── BACK face ── */}
            <div
              className="absolute inset-0 overflow-hidden border border-border/40"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 16,
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

        {/* ── Info panel below card ── */}
        <div className="w-60 space-y-2.5 rounded-2xl border border-border/60 bg-card/90 p-4 backdrop-blur-sm">
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
