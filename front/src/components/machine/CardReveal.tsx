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
  const [animKey, setAnimKey] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [showSweep, setShowSweep] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [shine, setShine] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!result) {
      setAnimDone(false)
      setShowSweep(false)
      setShowInfo(false)
      return
    }
    setAnimKey((k) => k + 1)
    setAnimDone(false)
    setShowSweep(false)
    setShowInfo(false)
    const sweepTimer = setTimeout(() => setShowSweep(true), 1800)
    const infoTimer = setTimeout(() => setShowInfo(true), 2000)
    return () => {
      clearTimeout(sweepTimer)
      clearTimeout(infoTimer)
    }
  }, [result])

  // ── Hover tilt (active after spiral animation ends) ────────────────────────

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!animDone || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    setTilt({ x: -dy * 14, y: dx * 14 })
    setShine({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setShine({ x: 50, y: 50 })
  }

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

      {/* ── Content container ── */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        className="flex flex-col items-center gap-5 px-4 py-8"
        style={{ perspective: '900px' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* ── 3D Card — spiral rise, then hover tilt ── */}
        <div
          key={animKey}
          ref={cardRef}
          className={animDone ? undefined : 'card-spiral-rise'}
          style={{
            width: '240px',
            height: '360px',
            transformStyle: 'preserve-3d',
            cursor: animDone ? 'default' : 'default',
            ...(animDone && {
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.18s ease-out',
            }),
          }}
          onAnimationEnd={() => setAnimDone(true)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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

          {/* Hover sheen — only visible after animation */}
          {animDone && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                borderRadius: 7,
                background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.18) 0%, transparent 55%)`,
                backfaceVisibility: 'hidden',
              }}
            />
          )}

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

        {/* ── Info panel ── */}
        <div
          className="w-60 space-y-2.5 rounded-2xl border border-border/60 bg-card/90 p-4 backdrop-blur-sm"
          style={{
            opacity: showInfo ? 1 : 0,
            transform: showInfo ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            pointerEvents: showInfo ? 'auto' : 'none',
          }}
        >
          {/* Duplicate / dust */}
          {result.wasDuplicate && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
              <span className="text-sm">✨</span>
              <p className="text-xs font-semibold text-amber-400">
                Doublon · +{result.dustEarned} poussière
              </p>
            </div>
          )}

          {/* Tokens remaining */}
          <p className="text-center text-xs text-text-light/50">
            <span className="font-semibold text-text-light/80">
              {result.tokensRemaining}
            </span>{' '}
            token{result.tokensRemaining !== 1 ? 's' : ''} restant
            {result.tokensRemaining !== 1 ? 's' : ''}
          </p>

          <Button className="w-full" onClick={onClose}>
            Nouveau tirage
          </Button>
        </div>
      </div>
    </div>
  )
}
