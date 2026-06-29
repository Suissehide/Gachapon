// front/src/components/machine/CardReveal.tsx
import { Coins, Sparkles, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'

import cardBackImg from '../../assets/data/card-back/black.png'
import type { CardRarity } from '../../constants/card.constant'
import type { PullResult } from '../../queries/useGacha'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { getRarityTone } from '../shared/tcg-card/config.ts'
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
  onNewPull: () => void
  isPulling?: boolean
}

export function CardReveal({ result, onClose, onNewPull, isPulling }: Props) {
  const [animKey, setAnimKey] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showBackdrop, setShowBackdrop] = useState(false)

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
      setShowInfo(false)
      setShowBackdrop(false)
      reset()
      return
    }
    setAnimKey((k) => k + 1)
    setAnimDone(false)
    setShowInfo(false)
    setShowBackdrop(false)
    reset()
    const revealTimer = setTimeout(() => triggerReveal(), 1200)
    const backdropTimer = setTimeout(() => setShowBackdrop(true), 1200)
    const infoTimer = setTimeout(() => setShowInfo(true), 2500)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(backdropTimer)
      clearTimeout(infoTimer)
    }
  }, [result, reset, triggerReveal])

  if (!result) {
    return null
  }

  const tone = getRarityTone(rarity)
  const backdrop = `radial-gradient(ellipse 60% 50% at 50% 50%, color-mix(in oklab, ${tone.hex} 18%, transparent) 0%, transparent 70%)`
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
      {/* Rarity backdrop glow — delayed to avoid spoiling rarity */}
      {showBackdrop && (
        <div
          className="pointer-events-none absolute inset-0 animate-in fade-in-0 duration-500"
          style={{ background: backdrop }}
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
          className={`w-64 overflow-hidden rounded-2xl border border-white/9 bg-[rgba(6,6,12,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[20px] ${
            showInfo
              ? 'animate-[fadeInUp_550ms_ease-out_forwards]'
              : 'translate-y-[calc(50vh+100%)] transition-transform duration-300 ease-in'
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
                    Doublon obtenu
                  </p>
                  <p className="text-sm font-bold text-amber-300">
                    Convertis-le en poussière depuis ta collection
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <div className="flex items-center gap-2">
              <Coins size={14} className="text-white/35" aria-hidden />
              <span className="text-xs text-white/45">Jetons restants</span>
            </div>
            <span className="font-display text-base font-bold text-white/90">
              {result.tokensRemaining}
            </span>
          </div>

          <div className="flex items-center gap-2 p-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
            <Button
              className="flex-1"
              disabled={result.tokensRemaining <= 0 || isPulling}
              onClick={onNewPull}
            >
              {isPulling ? 'Tirage en cours…' : 'Nouveau tirage'}
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
            setShowBackdrop(false)
            setAnimKey((k) => k + 1)
            setTimeout(() => {
              triggerReveal()
              setShowBackdrop(true)
            }, 1200)
          }}
        >
          ↺ replay
        </button>
      )}
    </div>
  )
}
