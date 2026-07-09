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
import { RevealAmbientBackground } from './RevealAmbientBackground'
import { RevealCanvases } from './RevealCanvases'
import { RevealInspectOverlay } from './RevealInspectOverlay'
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
  onClose: () => void
  // Pull context — omit for non-pull reveals (e.g. a claimed reward card),
  // which then show a plain "Fermer" button instead of the pull-again bar.
  tokensRemaining?: number
  onPullAgain?: (count: 1 | 10) => void
  // Fired the first time a given card is flipped (index into `results`). Lets
  // the caller reveal that card's achievements exactly when it's turned over.
  onCardRevealed?: (index: number) => void
  // Fired once every card has been flipped. Used to play deferred celebrations
  // (level-up) after the whole reveal is done.
  onAllRevealed?: () => void
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
  onCardRevealed,
  onAllRevealed,
}: Props) {
  const showPullAgain = onPullAgain !== undefined
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())
  const [revealAllTriggered, setRevealAllTriggered] = useState(false)
  const [activeEffect, setActiveEffect] = useState<ActiveEffect | null>(null)
  const [inspecting, setInspecting] = useState<PullBatchEntry | null>(null)
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

  // Meilleure rareté parmi les cartes déjà retournées — pilote le fond ambiant
  // en crescendo (best-of-lot, ne redescend jamais). null avant tout flip.
  const bestRevealed = useMemo<CardRarity | null>(() => {
    let best: CardRarity | null = null
    let bestRank = -1
    for (const idx of flipped) {
      const r = results[idx]?.card.rarity as CardRarity | undefined
      if (!r) {
        continue
      }
      const rank = RARITY_RANK[r] ?? 0
      if (rank > bestRank) {
        bestRank = rank
        best = r
      }
    }
    return best
  }, [flipped, results])

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
      if (alreadyFlipped) {
        return
      }
      // First time this card is turned over → let the caller reveal its
      // achievements (fires even on the "Tout révéler" cascade, which passes
      // suppressEffect to skip only the fullscreen flash).
      onCardRevealed?.(idx)
      if (suppressEffect) {
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
    [results, onCardRevealed],
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
  const allRevealedNotified = useRef(false)
  useEffect(() => {
    if (allRevealed) {
      // Fire once — deferred celebrations (level-up) play after the full reveal.
      if (!allRevealedNotified.current) {
        allRevealedNotified.current = true
        onAllRevealed?.()
      }
      const timer = setTimeout(() => setShowActions(true), 700)
      return () => clearTimeout(timer)
    }
    setShowActions(false)
  }, [allRevealed, onAllRevealed])

  const isSingle = results.length === 1

  return (
    <div
      data-reveal-modal
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
    >
      <RevealAmbientBackground rarity={bestRevealed} />

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

      {/* Scroll layer (viewport-sized) wrapping a min-h-full flex column: the
       *  content stays centered when it fits, and grows scrollable when it
       *  doesn't (10-pull grid on mobile) instead of being clipped by
       *  justify-center. Bottom padding keeps the last row clear of the fixed
       *  action bar. */}
      <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col items-center justify-center pb-32 md:pb-0">
          <div
            className={
              isSingle
                ? 'relative flex items-center justify-center'
                : 'relative grid grid-cols-5 max-md:grid-cols-2 gap-x-4 gap-y-10 p-8 pt-14'
            }
          >
            {stableResults.map(({ entry, key, idx }) => (
              <RevealCard
                key={key}
                entry={entry}
                flipped={flipped.has(idx)}
                onFlip={() => flipCard(idx)}
                onInspect={() => setInspecting(entry)}
                size={isSingle ? 'lg' : 'sm'}
                entryDelay={isSingle ? 0 : idx * 70}
                registerRef={(el) => {
                  cardRefs.current[idx] = el
                }}
              />
            ))}
          </div>

          {/* Reserved slot (button height h-10 + mt-8): keeps the flex column's
           *  height constant so removing the button on click doesn't recenter
           *  the grid and shift the cards down. */}
          <div className="relative mt-8 flex h-10 items-center justify-center">
            {!allRevealed && !revealAllTriggered && (
              <Button
                type="button"
                variant="gradient"
                size="lg"
                onClick={revealAll}
                className="rounded-full px-8 uppercase tracking-widest"
              >
                Tout révéler
              </Button>
            )}
          </div>
        </div>
      </div>

      {showActions && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 pt-3 animate-[fadeInUp_400ms_ease-out_forwards]"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.75) 45%)',
          }}
        >
          <div className="pointer-events-auto inline-flex items-center gap-4 rounded-[20px] bg-[#1b1726] px-5 py-3 text-white shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)]">
            {showPullAgain ? (
              <>
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
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      onClick={() => onPullAgain(1)}
                      disabled={(tokensRemaining ?? 0) < 1}
                      className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      Nouveau tirage x1
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={() => onPullAgain(10)}
                      disabled={(tokensRemaining ?? 0) < 10}
                      className="gap-2"
                    >
                      Tirage x10
                    </Button>
                  </div>
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
              </>
            ) : (
              <Button
                variant="gradient"
                onClick={onClose}
                className="gap-2 px-8 uppercase tracking-widest"
              >
                Génial !
              </Button>
            )}
          </div>
        </div>
      )}

      {inspecting && (
        <RevealInspectOverlay
          entry={inspecting}
          onClose={() => setInspecting(null)}
        />
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

type SpecialBadge = { label: string; Icon: typeof Sparkles; cls: string }

// Priority badge on a revealed card: boostGuarantee > goldenBall > freePull.
function getSpecialBadge(entry: PullBatchEntry): SpecialBadge | null {
  if (entry.wasBoostGuarantee) {
    return {
      label: 'EPIC garanti',
      Icon: Sparkles,
      cls: 'bg-violet-600/95 shadow-violet-700/40',
    }
  }
  if (entry.wasGoldenBall) {
    return {
      label: "Boule d'or",
      Icon: Trophy,
      cls: 'bg-amber-500/95 shadow-amber-600/40',
    }
  }
  if (entry.wasFreePull) {
    return {
      label: 'Gratuit',
      Icon: Gift,
      cls: 'bg-sky-500/95 shadow-sky-600/40',
    }
  }
  return null
}

type CardProps = {
  entry: PullBatchEntry
  flipped: boolean
  onFlip: () => void
  // Fired when an already-flipped card is tapped — opens the zoom overlay.
  onInspect: () => void
  size: 'lg' | 'sm'
  entryDelay: number
  registerRef: (el: HTMLDivElement | null) => void
}

const VARIANT_LABELS: Record<string, string> = {
  BRILLIANT: 'Brillant',
  HOLOGRAPHIC: 'Holographique',
}

// Variant name under the card (mirrors the rarity label on top). Gold for
// brilliant, prismatic gradient text for holographic.
function VariantLabel({
  variant,
  size,
}: {
  variant: string
  size: 'lg' | 'sm'
}) {
  const label = VARIANT_LABELS[variant]
  if (!label) {
    return null
  }
  const isHolo = variant === 'HOLOGRAPHIC'
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap font-display font-black uppercase animate-[fadeInUp_320ms_ease-out_forwards] ${
        size === 'lg'
          ? '-bottom-5 text-base tracking-[0.2em]'
          : '-bottom-3 text-[9px] tracking-[0.14em]'
      }`}
      style={
        isHolo
          ? {
              backgroundImage:
                'linear-gradient(90deg, #22d3ee, #a855f7, #f59e0b, #ec4899)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
            }
          : {
              color: '#fbbf24',
              textShadow: '0 0 8px #fbbf24, 0 1px 3px rgba(0,0,0,0.6)',
            }
      }
    >
      {label}
    </div>
  )
}

function RevealCard({
  entry,
  flipped,
  onFlip,
  onInspect,
  size,
  entryDelay,
  registerRef,
}: CardProps) {
  const rarity = entry.card.rarity as CardRarity
  const tone = getRarityTone(rarity)
  const [showLabel, setShowLabel] = useState(false)

  const specialBadge = getSpecialBadge(entry)

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

      {/* Variant name below the card — mirrors the rarity label above. */}
      {showLabel && entry.card.variant && (
        <VariantLabel variant={entry.card.variant} size={size} />
      )}

      <button
        type="button"
        onClick={flipped ? onInspect : onFlip}
        aria-label={
          flipped ? `Inspecter ${entry.card.name}` : 'Révéler la carte'
        }
        className={`relative h-full w-full rounded-2xl bg-transparent ${
          flipped
            ? 'cursor-zoom-in'
            : 'cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-[0_0_24px_var(--rar-glow)]'
        }`}
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
                showAura
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
