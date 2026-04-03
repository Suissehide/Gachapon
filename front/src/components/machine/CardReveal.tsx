// front/src/components/machine/CardReveal.tsx
import { Coins, Sparkles } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'

import cardBackImg from '../../assets/data/card-back/black.png'
import type { CardRarity } from '../../constants/card.constant'
import type { PullResult } from '../../queries/useGacha'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { RARITY_TCG_CONFIG } from '../shared/tcg-card/config.ts'
import { Button } from '../ui/button.tsx'
import { RevealCanvases } from './reveal/RevealCanvases.tsx'
import { RARITY_CONFIG } from './reveal/rarityConfig.ts'
import { useRevealEffect } from './reveal/useRevealEffect.ts'

// ── ImpactWord ─────────────────────────────────────────────────────────────────

type ImpactWordProps = {
  text: string
  pos: { x: number; y: number }
  impactColor: string
  impactStroke: string
  impactSize: string
  impactExtraShadow?: string
}

function ImpactWord({
  text,
  pos,
  impactColor,
  impactStroke,
  impactSize,
  impactExtraShadow,
}: ImpactWordProps) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setFading(true), 600)
    return () => clearTimeout(id)
  }, [])

  const shadow =
    impactExtraShadow ??
    [
      `3px 3px 0 ${impactStroke}`,
      `6px 6px 0 ${impactStroke}`,
      `9px 9px 0 rgba(0,0,0,0.2)`,
      `-1px -1px 0 ${impactStroke}`,
    ].join(', ')

  return (
    <div
      style={
        {
          position: 'fixed',
          left: pos.x,
          top: pos.y - 110,
          fontFamily: 'Impact, Arial Black, sans-serif',
          fontSize: impactSize,
          color: impactColor,
          WebkitTextStroke: `3px ${impactStroke}`,
          textShadow: shadow,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          zIndex: 80,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          animation: fading
            ? 'impactFade 180ms ease-in forwards'
            : 'impactPop 250ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        } as React.CSSProperties
      }
    >
      {text}
    </div>
  )
}

// ── CardReveal ─────────────────────────────────────────────────────────────────

type Props = {
  result: PullResult | null
  onClose: () => void
}

export function CardReveal({ result, onClose }: Props) {
  const [animKey, setAnimKey] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [showSweep, setShowSweep] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const rarity = (result?.card.rarity ?? 'COMMON') as CardRarity

  const {
    containerRef,
    canvasRefs,
    impactVisible,
    impactPos,
    triggerReveal,
    reset,
  } = useRevealEffect(rarity)

  useEffect(() => {
    if (!result) {
      setAnimDone(false)
      setShowSweep(false)
      setShowInfo(false)
      reset()
      return
    }
    setAnimKey((k) => k + 1)
    setAnimDone(false)
    setShowSweep(false)
    setShowInfo(false)
    reset()
    const revealTimer = setTimeout(() => triggerReveal(), 1200)
    const sweepTimer = setTimeout(() => setShowSweep(true), 1800)
    const infoTimer = setTimeout(() => setShowInfo(true), 2000)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(sweepTimer)
      clearTimeout(infoTimer)
    }
  }, [result, reset, triggerReveal])

  if (!result) {
    return null
  }

  const tcgConfig = RARITY_TCG_CONFIG[rarity] ?? RARITY_TCG_CONFIG.COMMON
  const effectConfig = RARITY_CONFIG[rarity]
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
      {tcgConfig.backdropColor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: tcgConfig.backdropColor }}
        />
      )}

      {/* Canvas effect layers (fixed, above modal) */}
      <RevealCanvases refs={canvasRefs} />

      {/* Impact word */}
      {impactVisible && impactPos && effectConfig.impactText && (
        <ImpactWord
          text={effectConfig.impactText}
          pos={impactPos}
          impactColor={effectConfig.impactColor}
          impactStroke={effectConfig.impactStroke}
          impactSize={effectConfig.impactSize}
          impactExtraShadow={effectConfig.impactExtraShadow}
        />
      )}

      {/* ── Content container ── */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        data-reveal-modal
        className="relative z-10 flex flex-col items-center gap-5 px-4 py-8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div ref={containerRef}>
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
        </div>

        {/* ── Info panel ── */}
        <div
          className={`w-64 overflow-hidden rounded-2xl border border-white/9 bg-[rgba(6,6,12,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[20px] transition-[opacity,transform] duration-550 ease-out ${
            showInfo
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-3.5 opacity-0'
          }`}
        >
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

          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <div className="flex items-center gap-2">
              <Coins size={14} className="text-white/35" aria-hidden />
              <span className="text-xs text-white/45">Tokens restants</span>
            </div>
            <span className="font-display text-base font-bold text-white/90">
              {result.tokensRemaining}
            </span>
          </div>

          <div className="p-3">
            <Button className="w-full" onClick={onClose}>
              Nouveau tirage
            </Button>
          </div>
        </div>
      </div>

      {/* ── Dev: replay button ── */}
      {import.meta.env.DEV && (
        <button
          type="button"
          className="fixed bottom-4 right-4 z-[100] rounded bg-black/70 px-3 py-1.5 text-xs text-white/80 hover:text-white"
          onClick={(e) => {
            e.stopPropagation()
            reset()
            setAnimDone(false)
            setAnimKey((k) => k + 1)
            setTimeout(() => triggerReveal(), 1200)
          }}
        >
          ↺ replay
        </button>
      )}
    </div>
  )
}
