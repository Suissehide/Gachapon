import { Coins, Gift, Sparkles, Trophy, X } from 'lucide-react'
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import cardBackImg from '../../../assets/data/card-back/star.png'
import type { CardRarity } from '../../../constants/card.constant'
import type { PullBatchEntry } from '../../../queries/useGacha'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'
import { getRarityTone } from '../../shared/tcg-card/config'
import { Button } from '../../ui/button'
import { RevealCanvases } from './RevealCanvases'
import { RARITY_CONFIG } from './rarityConfig'
import { useRevealEffect } from './useRevealEffect'

const RARITY_RANK: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
}

type Props = {
  results: PullBatchEntry[]
  tokensRemaining: number
  onClose: () => void
  onPullAgain: (count: 1 | 10) => void
}

type ActiveEffect = {
  rarity: CardRarity
  seq: number
  centerX: number
  centerY: number
}

export function RevealGrid({
  results,
  tokensRemaining,
  onClose,
  onPullAgain,
}: Props) {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())
  const [revealAllTriggered, setRevealAllTriggered] = useState(false)
  const [activeEffect, setActiveEffect] = useState<ActiveEffect | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  const stableResults = useMemo(
    () =>
      results.map((entry, i) => ({
        entry,
        key: `${i}-${entry.card.id}`,
        idx: i,
      })),
    [results],
  )

  const flipCard = useCallback(
    (idx: number, suppressEffect = false) => {
      let alreadyFlipped = false
      setFlipped((prev) => {
        if (prev.has(idx)) {
          alreadyFlipped = true
          return prev
        }
        const next = new Set(prev)
        next.add(idx)
        return next
      })
      if (alreadyFlipped || suppressEffect) {
        return
      }
      // Center the fullscreen effect on the card that was just flipped so the
      // radial animation reads as "coming out of this specific card".
      const el = cardRefs.current[idx]
      const rect = el?.getBoundingClientRect()
      const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      setActiveEffect((prev) => ({
        rarity: results[idx].card.rarity as CardRarity,
        seq: (prev?.seq ?? 0) + 1,
        centerX,
        centerY,
      }))
    },
    [results],
  )

  const revealAll = () => {
    if (revealAllTriggered) {
      return
    }
    setRevealAllTriggered(true)
    const remaining = results
      .map((r, i) => ({ i, rank: RARITY_RANK[r.card.rarity] ?? 0 }))
      .filter(({ i }) => !flipped.has(i))
      .sort((a, b) => a.rank - b.rank)
    // "Tout révéler" flips 10 cards in cascade — suppress the fullscreen
    // rarity effect so we don't spam 10 flashes back-to-back.
    remaining.forEach(({ i }, order) => {
      setTimeout(() => flipCard(i, true), order * 150)
    })
  }

  const allRevealed = flipped.size === results.length
  const [showActions, setShowActions] = useState(false)
  useEffect(() => {
    if (allRevealed) {
      const timer = setTimeout(() => setShowActions(true), 700)
      return () => clearTimeout(timer)
    }
    setShowActions(false)
  }, [allRevealed])

  const isSingle = results.length === 1

  return (
    <div
      data-reveal-modal
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md"
    >
      {/* Fullscreen rarity effect — re-mounts on every flip via seq key so the
       *  animation replays. Positioned at the flipped card's viewport center. */}
      {activeEffect && (
        <FullscreenRarityEffect
          key={activeEffect.seq}
          rarity={activeEffect.rarity}
          centerX={activeEffect.centerX}
          centerY={activeEffect.centerY}
        />
      )}

      <div
        className={
          isSingle
            ? 'relative z-10 flex items-center justify-center'
            : 'relative z-10 grid grid-cols-5 max-md:grid-cols-2 gap-x-4 gap-y-10 p-8 pt-14'
        }
      >
        {stableResults.map(({ entry, key, idx }) => (
          <RevealCard
            key={key}
            entry={entry}
            flipped={flipped.has(idx)}
            onFlip={() => flipCard(idx)}
            size={isSingle ? 'lg' : 'sm'}
            entryDelay={isSingle ? 0 : idx * 70}
            registerRef={(el) => {
              cardRefs.current[idx] = el
            }}
          />
        ))}
      </div>

      {!allRevealed && !revealAllTriggered && (
        <Button
          type="button"
          variant="gradient"
          size="lg"
          onClick={revealAll}
          className="relative z-10 mt-8 rounded-full px-8 uppercase tracking-widest"
        >
          Tout révéler
        </Button>
      )}

      {showActions && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 pt-3 animate-[fadeInUp_400ms_ease-out_forwards]"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.75) 45%)',
          }}
        >
          <div className="pointer-events-auto inline-flex items-center gap-4 rounded-[20px] bg-[#1b1726] px-5 py-3 text-white shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
                  Jetons restants
                </div>
                <div className="font-display text-lg font-extrabold tabular-nums text-amber-400 leading-none">
                  {tokensRemaining}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onPullAgain(1)}
                disabled={tokensRemaining < 1}
                className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Nouveau tirage x1
              </Button>
              <Button
                variant="gradient"
                onClick={() => onPullAgain(10)}
                disabled={tokensRemaining < 10}
                className="gap-2"
              >
                Tirage x10
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Fermer"
                className="border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FullscreenRarityEffect ─────────────────────────────────────────────────
// Fullscreen canvases + big impact word. The `containerRef` is placed at the
// clicked card's viewport center (as a 1×1 point) so useRevealEffect emits its
// waves/particles/etc. from that spot instead of from the screen middle.

function FullscreenRarityEffect({
  rarity,
  centerX,
  centerY,
}: {
  rarity: CardRarity
  centerX: number
  centerY: number
}) {
  const { containerRef, canvasRefs, impactVisible, triggerReveal } =
    useRevealEffect(rarity)
  const config = RARITY_CONFIG[rarity]
  const tone = getRarityTone(rarity)

  useEffect(() => {
    triggerReveal()
  }, [triggerReveal])

  return (
    <>
      {/* Center anchor — useRevealEffect measures containerRef.getBoundingClientRect
       *  and uses that midpoint as the effect origin. */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: centerX,
          top: centerY,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />
      <RevealCanvases refs={canvasRefs} />
      {impactVisible && config.impactText && (
        <div
          style={{
            position: 'fixed',
            left: centerX,
            top: centerY - 160,
            transform: 'translateX(-50%)',
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontSize: '4.5rem',
            color: tone.hex,
            WebkitTextStroke: `3px ${tone.dark}`,
            textShadow: [
              `3px 3px 0 ${tone.dark}`,
              `6px 6px 0 ${tone.dark}`,
              `9px 9px 0 rgba(0,0,0,0.35)`,
              `-1px -1px 0 ${tone.dark}`,
            ].join(', '),
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            zIndex: 40,
          }}
        >
          {config.impactText}
        </div>
      )}
    </>
  )
}

// ── RevealCard ──────────────────────────────────────────────────────────────

type CardProps = {
  entry: PullBatchEntry
  flipped: boolean
  onFlip: () => void
  size: 'lg' | 'sm'
  entryDelay: number
  registerRef: (el: HTMLDivElement | null) => void
}

function RevealCard({
  entry,
  flipped,
  onFlip,
  size,
  entryDelay,
  registerRef,
}: CardProps) {
  const rarity = entry.card.rarity as CardRarity
  const tone = getRarityTone(rarity)
  const [showLabel, setShowLabel] = useState(false)

  // Priority badge: boostGuarantee > goldenBall > freePull > NEW (existing)
  const specialBadge = entry.wasBoostGuarantee
    ? {
        label: 'EPIC garanti',
        Icon: Sparkles,
        cls: 'bg-violet-600/95 shadow-violet-700/40',
      }
    : entry.wasGoldenBall
      ? {
          label: "Boule d'or",
          Icon: Trophy,
          cls: 'bg-amber-500/95 shadow-amber-600/40',
        }
      : entry.wasFreePull
        ? {
            label: 'Gratuit',
            Icon: Gift,
            cls: 'bg-sky-500/95 shadow-sky-600/40',
          }
        : null

  useEffect(() => {
    if (flipped) {
      const timer = setTimeout(() => setShowLabel(true), 550)
      return () => clearTimeout(timer)
    }
    setShowLabel(false)
  }, [flipped])

  const dimensions = size === 'lg' ? 'w-64 aspect-[2/3]' : 'w-36 aspect-[2/3]'

  return (
    <div
      ref={registerRef}
      className={`relative ${dimensions} animate-[fadeIn_320ms_ease-out_backwards]`}
      style={
        {
          animationDelay: `${entryDelay}ms`,
          '--rar-glow': tone.hex,
        } as CSSProperties
      }
    >
      {/* Rarity name above the card — appears after flip. Small + tight
       *  tracking so "Peu commun" fits on one line at w-36. For the single
       *  (lg) reveal it sits higher and larger. z-30 keeps it above the card
       *  when the interactive tilt brings the top edge forward on hover. */}
      {showLabel && (
        <div
          className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-display font-black uppercase animate-[fadeInDown_320ms_ease-out_forwards] ${
            size === 'lg'
              ? '-top-8 text-base tracking-[0.2em]'
              : '-top-5 text-[9px] tracking-[0.14em]'
          }`}
          style={{
            color: tone.hex,
            textShadow: `0 0 8px ${tone.hex}, 0 1px 3px rgba(0,0,0,0.6)`,
          }}
        >
          {tone.label}
        </div>
      )}

      <button
        type="button"
        onClick={flipped ? undefined : onFlip}
        className={`relative h-full w-full rounded-2xl bg-transparent disabled:cursor-default ${
          flipped
            ? ''
            : 'cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-[0_0_24px_var(--rar-glow)]'
        }`}
        disabled={flipped}
      >
        {!flipped && (
          <img
            src={cardBackImg}
            alt="dos de carte"
            className="h-full w-full rounded-2xl object-cover"
            draggable={false}
          />
        )}
        {flipped && (
          <>
            <div className="h-full w-full animate-[flipReveal_500ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
              <CardDisplay
                rarity={rarity}
                name={entry.card.name}
                setName={entry.card.set.name}
                imageUrl={entry.card.imageUrl}
                variant={entry.card.variant}
                interactive
                compact
                newBadge={
                  !entry.wasDuplicate &&
                  !entry.wasFreePull &&
                  !entry.wasGoldenBall &&
                  !entry.wasBoostGuarantee
                }
              />
            </div>
            {specialBadge && (
              <span
                className={`pointer-events-none absolute top-2 right-2 z-50 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${specialBadge.cls}`}
              >
                <specialBadge.Icon className="h-3 w-3" strokeWidth={2.5} />
                {specialBadge.label}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
