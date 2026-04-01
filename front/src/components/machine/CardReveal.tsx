import { Coins, Sparkles } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'

import cardBackImg from '../../assets/data/card-back/black.png'
import type { PullResult } from '../../queries/useGacha'
import { RARITY_TCG_CONFIG } from '../shared/tcg-card/config.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
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
      {/* Rarity backdrop glow — dynamic gradient, must stay inline */}
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
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <CardDisplay
          rarity={rarity}
          name={result.card.name}
          setName={result.card.set.name}
          imageUrl={result.card.imageUrl}
          variant={variant}
          showSweep={showSweep}
          interactive={animDone}
          animKey={animKey}
          animClass={animDone ? '' : 'card-spiral-rise'}
          onAnimationEnd={() => setAnimDone(true)}
          backFace={
            <img
              src={cardBackImg}
              alt="dos de carte"
              className="h-full w-full rounded-2xl object-cover"
            />
          }
        />

        {/* ── Info panel ── */}
        <div
          className={`w-64 overflow-hidden rounded-2xl border border-white/9 bg-[rgba(6,6,12,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[20px] transition-[opacity,transform] duration-550 ease-out ${
            showInfo
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-3.5 opacity-0'
          }`}
        >
          {/* Duplicate / dust */}
          {result.wasDuplicate && (
            <div className="border-b border-amber-600/30 bg-[linear-gradient(135deg,rgba(217,119,6,0.28)_0%,rgba(251,191,36,0.14)_100%)] px-4 py-2.75">
              <div className="flex items-center gap-3">
                <Sparkles
                  size={16}
                  className="shrink-0 text-amber-400"
                  aria-hidden
                />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/65">
                    Doublon
                  </p>
                  <p className="text-sm font-bold text-amber-300">
                    +{result.dustEarned} poussière
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tokens remaining */}
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <div className="flex items-center gap-2">
              <Coins size={14} className="text-white/35" aria-hidden />
              <span className="text-xs text-white/45">Tokens restants</span>
            </div>
            <span className="font-display text-base font-bold text-white/90">
              {result.tokensRemaining}
            </span>
          </div>

          {/* CTA */}
          <div className="p-3">
            <Button className="w-full" onClick={onClose}>
              Nouveau tirage
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
