import { Gift, Sparkles, Star, Ticket, Trophy, X } from 'lucide-react'
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
import { EFFECT_CONFIG, type EffectKey, resolveEffectKey } from './rarityConfig'
import { useRevealEffect } from './useRevealEffect'

const EFFECT_RANK: Record<EffectKey, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  BRILLIANT: 3.5,
  LEGENDARY: 4,
  HOLOGRAPHIC: 4.5,
}

const noop = () => undefined

type Props = {
  results: PullBatchEntry[]
  onClose: () => void
  // Pull context — omit for non-pull reveals (e.g. a claimed reward card),
  // which then show a plain "Fermer" button instead of the pull-again bar.
  tokensRemaining?: number
  onPullAgain?: (count: number) => void
  // Fired the first time a given card is flipped (index into `results`). Lets
  // the caller reveal that card's achievements exactly when it's turned over.
  onCardRevealed?: (index: number) => void
  // Fired once every card has been flipped. Used to play deferred celebrations
  // (level-up) after the whole reveal is done.
  onAllRevealed?: () => void
}

type ActiveEffect = {
  rarity: CardRarity
  variant: string | null
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

  // Dépilage un-par-un pour les reveals multi-cartes : on démarre en mode
  // pile, chaque clic révèle la carte du dessus en grand, puis la grille
  // habituelle s'affiche une fois tout dépilé (ou sur « Passer »).
  type StackState =
    | { mode: 'grid' }
    | { mode: 'stack'; step: 'pile' | 'showing' | 'exiting'; index: number }
  const [stack, setStack] = useState<StackState>(() =>
    results.length > 1
      ? { mode: 'stack', step: 'pile', index: 0 }
      : { mode: 'grid' },
  )

  // Léger décalage/rotation aléatoire par carte de la pile, figé au montage
  // pour que la pile ne se réorganise pas à chaque render.
  const pileJitter = useMemo(
    () =>
      results.map(() => ({
        dx: (Math.random() - 0.5) * 16,
        dy: (Math.random() - 0.5) * 12,
        rot: (Math.random() - 0.5) * 10,
      })),
    [results],
  )

  const revealNextFromPile = () => {
    if (stack.mode !== 'stack' || stack.step !== 'pile') {
      return
    }
    flipCard(stack.index)
    setStack({ mode: 'stack', step: 'showing', index: stack.index })
  }

  const dismissShownCard = () => {
    if (stack.mode !== 'stack' || stack.step !== 'showing') {
      return
    }
    setStack({ mode: 'stack', step: 'exiting', index: stack.index })
    exitTimerRef.current = setTimeout(() => {
      setStack((prev) => {
        if (prev.mode !== 'stack') {
          return prev
        }
        const next = prev.index + 1
        return next >= results.length
          ? { mode: 'grid' }
          : { mode: 'stack', step: 'pile', index: next }
      })
    }, 180)
  }

  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stableResults = useMemo(
    () =>
      results.map((entry, i) => ({
        entry,
        key: `${i}-${entry.card.id}`,
        idx: i,
      })),
    [results],
  )

  // Meilleure clé d'effet parmi les cartes déjà retournées — pilote le fond
  // ambiant en crescendo (best-of-lot, ne redescend jamais). null avant tout flip.
  const bestRevealed = useMemo<EffectKey | null>(() => {
    let best: EffectKey | null = null
    let bestRank = -1
    for (const idx of flipped) {
      const entry = results[idx]
      if (!entry) {
        continue
      }
      const key = resolveEffectKey(
        entry.card.rarity as CardRarity,
        entry.card.variant,
      )
      const rank = EFFECT_RANK[key] ?? 0
      if (rank > bestRank) {
        bestRank = rank
        best = key
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
        variant: results[idx].card.variant,
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
      .map((r, i) => ({
        i,
        rank:
          EFFECT_RANK[
            resolveEffectKey(r.card.rarity as CardRarity, r.card.variant)
          ] ?? 0,
      }))
      .filter(({ i }) => !flipped.has(i))
      .sort((a, b) => a.rank - b.rank)
    // "Tout révéler" flips 10 cards in cascade — suppress the fullscreen
    // rarity effect so we don't spam 10 flashes back-to-back.
    remaining.forEach(({ i }, order) => {
      setTimeout(() => flipCard(i, true), order * 150)
    })
  }

  const skipStack = () => {
    if (stack.mode !== 'stack') {
      return
    }
    setStack({ mode: 'grid' })
    revealAll()
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

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
      }
    }
  }, [])

  const isSingle = results.length === 1

  return (
    <div
      data-reveal-modal
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
    >
      <RevealAmbientBackground effectKey={bestRevealed} />

      {/* Fullscreen rarity effect — re-mounts on every flip via seq key so the
       *  animation replays. Positioned at the flipped card's viewport center. */}
      {activeEffect && (
        <FullscreenRarityEffect
          key={activeEffect.seq}
          rarity={activeEffect.rarity}
          variant={activeEffect.variant}
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
        {stack.mode === 'stack' ? (
          <StackReveal
            step={stack.step}
            index={stack.index}
            results={results}
            stableResults={stableResults}
            pileJitter={pileJitter}
            flipped={flipped}
            onRevealNext={revealNextFromPile}
            onDismiss={dismissShownCard}
            onSkip={skipStack}
          />
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center pb-32 md:pb-0">
            {isSingle ? (
              <SingleReveal
                entry={results[0]}
                flipped={flipped.has(0)}
                onFlip={() => flipCard(0)}
                onInspect={() => setInspecting(results[0])}
                registerRef={(el) => {
                  cardRefs.current[0] = el
                }}
              />
            ) : (
              <div className="relative grid grid-cols-5 max-md:grid-cols-2 gap-x-4 gap-y-10 p-8 pt-14">
                {stableResults.map(({ entry, key, idx }) => (
                  <RevealCard
                    key={key}
                    entry={entry}
                    flipped={flipped.has(idx)}
                    onFlip={() => flipCard(idx)}
                    onInspect={() => setInspecting(entry)}
                    size="sm"
                    entryDelay={idx * 70}
                    registerRef={(el) => {
                      cardRefs.current[idx] = el
                    }}
                  />
                ))}
              </div>
            )}

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
        )}
      </div>

      {showActions && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 pt-3 animate-[fadeInUp_400ms_ease-out_forwards]"
          // The full-width scrim only exists to keep the wide "pull again" bar
          // legible over the card grid. For the lone "Génial" pill it just reads
          // as a stray dark band, and the modal backdrop already darkens things.
          style={
            showPullAgain
              ? {
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.75) 45%)',
                }
              : undefined
          }
        >
          <div className="pointer-events-auto inline-flex items-center gap-4 rounded-[20px] bg-[#1b1726] px-5 py-3 text-white shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)]">
            {showPullAgain ? (
              <>
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-amber-400" />
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

// ── StackReveal ─────────────────────────────────────────────────────────────
// Dépilage un-par-un : pile de dos jitterés, puis carte du dessus révélée en
// grand avec un impact (chute + squash + shake + ondes) dont l'intensité monte
// avec la rareté. Présentation pure — la machine à états reste dans RevealGrid.

type StackRevealProps = {
  step: 'pile' | 'showing' | 'exiting'
  index: number
  results: PullBatchEntry[]
  stableResults: Array<{ entry: PullBatchEntry; key: string; idx: number }>
  pileJitter: Array<{ dx: number; dy: number; rot: number }>
  flipped: Set<number>
  onRevealNext: () => void
  onDismiss: () => void
  onSkip: () => void
}

// Intensité d'impact par rang d'effet (EFFECT_RANK 0 → 4.5) : shake, taille et
// opacité de l'onde montent linéairement ; à partir d'ÉPIQUE une seconde onde
// part en écho, et LÉGENDAIRE/HOLO ajoutent un flash radial derrière la carte.
function impactParams(entry: PullBatchEntry) {
  const rank =
    EFFECT_RANK[
      resolveEffectKey(entry.card.rarity as CardRarity, entry.card.variant)
    ] ?? 0
  return {
    rank,
    shakeAmp: `${Math.round(6 + rank * 2.5)}px`,
    waveScale: (1.4 + rank * 0.3).toFixed(2),
    waveOpacity: (0.35 + rank * 0.08).toFixed(2),
  }
}

const RARITY_WAVE_GRADIENT =
  'radial-gradient(50% 50% at 50% 50%, var(--rar-glow), transparent 70%)'

// Effets d'impact au toucher au sol (150 ms après le début de la chute) —
// teintés par le --rar-glow du parent, montée en gamme avec le rang : onde
// seule, + écho dès ÉPIQUE, + flash radial pour LÉGENDAIRE/HOLO.
function ImpactWaves({
  rank,
  waveScale,
  waveOpacity,
}: {
  rank: number
  waveScale: string
  waveOpacity: string
}) {
  return (
    <>
      {rank >= 4 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[12%] rounded-3xl opacity-0 blur-2xl animate-[stackImpactFlash_300ms_ease-out_150ms_forwards]"
          style={{ background: RARITY_WAVE_GRADIENT }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-5 left-1/2 h-16 w-80 rounded-[50%] opacity-0 blur-md animate-[stackImpactWave_320ms_ease-out_150ms_forwards]"
        style={
          {
            background: RARITY_WAVE_GRADIENT,
            '--wave-scale': waveScale,
            '--wave-opacity': waveOpacity,
          } as CSSProperties
        }
      />
      {rank >= 3 && (
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-20 w-96 rounded-[50%] opacity-0 blur-lg animate-[stackImpactWave_420ms_ease-out_230ms_forwards]"
          style={
            {
              background: RARITY_WAVE_GRADIENT,
              '--wave-scale': waveScale,
              '--wave-opacity': '0.3',
            } as CSSProperties
          }
        />
      )}
    </>
  )
}

function StackReveal({
  step,
  index,
  results,
  stableResults,
  pileJitter,
  flipped,
  onRevealNext,
  onDismiss,
  onSkip,
}: StackRevealProps) {
  const entry = results[index]
  const tone = getRarityTone(entry.card.rarity as CardRarity)
  const impact = impactParams(entry)
  const remaining = results.length - index

  return (
    // Key par étape : remonte le conteneur à chaque carte révélée pour rejouer
    // le screenShake d'impact (retardé pour coïncider avec le toucher au sol
    // de stackCardDrop, à 70 % de ses 220 ms).
    <div
      key={step === 'pile' ? `pile-${index}` : `impact-${index}`}
      className={
        step === 'pile'
          ? 'relative flex min-h-full flex-col items-center justify-center pb-32 md:pb-0'
          : 'relative flex min-h-full flex-col items-center justify-center pb-32 md:pb-0 animate-[screenShake_260ms_ease-out_150ms]'
      }
      style={
        step === 'pile'
          ? undefined
          : ({ '--shake-amp': impact.shakeAmp } as CSSProperties)
      }
    >
      {step === 'pile' ? (
        <>
          <button
            type="button"
            onClick={onRevealNext}
            aria-label="Révéler la carte suivante"
            className="group relative aspect-[2/3] w-40 cursor-pointer bg-transparent"
          >
            {/* Ordre inversé : la prochaine carte à révéler (index) est peinte
             *  en dernier, donc visuellement au-dessus. Au hover, seule elle
             *  réagit — avec le halo de SA rareté, comme les cartes face
             *  cachée de la grille (petit spoiler assumé, même langage). */}
            {stableResults
              .filter(({ idx }) => idx >= index)
              .reverse()
              .map(({ key, idx }) => (
                <img
                  key={key}
                  src={cardBackImg}
                  alt=""
                  draggable={false}
                  className={
                    idx === index
                      ? 'absolute inset-0 h-full w-full rounded-2xl object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-200 group-hover:scale-[1.06] group-hover:shadow-[0_0_28px_var(--rar-glow)]'
                      : 'absolute inset-0 h-full w-full rounded-2xl object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
                  }
                  style={
                    {
                      transform: `translate(${pileJitter[idx].dx}px, ${pileJitter[idx].dy}px) rotate(${pileJitter[idx].rot}deg)`,
                      ...(idx === index ? { '--rar-glow': tone.hex } : {}),
                    } as CSSProperties
                  }
                />
              ))}
          </button>
          <p className="mt-10 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            {remaining} {remaining > 1 ? 'cartes restantes' : 'carte restante'}
          </p>
        </>
      ) : (
        <>
          {/* Fond cliquable plein écran : n'importe quel clic passe à la
           *  carte suivante (la carte elle-même avance via onInspect). */}
          <button
            type="button"
            aria-label="Carte suivante"
            onClick={onDismiss}
            className="absolute inset-0 z-0 cursor-pointer bg-transparent"
          />
          <div
            className={
              step === 'exiting'
                ? 'relative z-10 animate-[stackCardOut_180ms_ease-in_forwards]'
                : 'relative z-10 animate-[stackCardDrop_220ms_cubic-bezier(0.45,0,1,0.55)_both]'
            }
            style={{ '--rar-glow': tone.hex } as CSSProperties}
          >
            {step === 'showing' && (
              <ImpactWaves
                rank={impact.rank}
                waveScale={impact.waveScale}
                waveOpacity={impact.waveOpacity}
              />
            )}
            <RevealCard
              key={stableResults[index].key}
              entry={entry}
              flipped={flipped.has(index)}
              onFlip={noop}
              onInspect={onDismiss}
              size="lg"
              entryDelay={0}
              // Pas de ref en mode pile — flipCard retombe sur le centre de l'écran, là où la carte apparaît.
              registerRef={noop}
            />
          </div>
        </>
      )}
      <div className="relative z-10 mt-8 flex h-10 items-center justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={onSkip}
          className="rounded-full border-white/20 bg-transparent px-8 uppercase tracking-widest text-white hover:bg-white/10 hover:text-white"
        >
          Passer
        </Button>
      </div>
    </div>
  )
}

// ── SingleReveal ────────────────────────────────────────────────────────────
// Reveal à carte unique : la carte arrive dos visible en mode impact (chute +
// shake neutres, en blanc pour ne pas spoiler la rareté), puis rejoue l'impact
// aux couleurs et à l'intensité de sa rareté quand on la retourne.

type SingleRevealProps = {
  entry: PullBatchEntry
  flipped: boolean
  onFlip: () => void
  onInspect: () => void
  registerRef: (el: HTMLDivElement | null) => void
}

function SingleReveal({
  entry,
  flipped,
  onFlip,
  onInspect,
  registerRef,
}: SingleRevealProps) {
  const tone = getRarityTone(entry.card.rarity as CardRarity)
  const impact = impactParams(entry)

  return (
    // Key sur l'état retourné : le remount rejoue chute + shake + ondes au flip.
    <div
      key={flipped ? 'face' : 'dos'}
      className="relative flex items-center justify-center animate-[screenShake_260ms_ease-out_150ms]"
      style={
        {
          '--shake-amp': flipped ? impact.shakeAmp : '7px',
          '--rar-glow': flipped ? tone.hex : '#ffffff',
        } as CSSProperties
      }
    >
      <div className="relative animate-[stackCardDrop_220ms_cubic-bezier(0.45,0,1,0.55)_both]">
        <ImpactWaves
          rank={flipped ? impact.rank : 0}
          waveScale={flipped ? impact.waveScale : '1.4'}
          waveOpacity={flipped ? impact.waveOpacity : '0.35'}
        />
        <RevealCard
          entry={entry}
          flipped={flipped}
          onFlip={onFlip}
          onInspect={onInspect}
          size="lg"
          entryDelay={0}
          registerRef={registerRef}
        />
      </div>
    </div>
  )
}

// ── FullscreenRarityEffect ─────────────────────────────────────────────────
// Fullscreen canvases + big impact word. The `containerRef` is placed at the
// clicked card's viewport center (as a 1×1 point) so useRevealEffect emits its
// waves/particles/etc. from that spot instead of from the screen middle.

type ImpactKind = 'rarity' | 'brilliant' | 'holo'

// Variant cards override the rarity word with a shimmering gradient word.
const IMPACT_VARIANT: Record<
  'brilliant' | 'holo',
  { text: string; gradient: string; stroke: string; dur: string }
> = {
  brilliant: {
    text: 'SCINTILLANT!',
    gradient:
      'linear-gradient(120deg, #b45309, #fde68a, #f59e0b, #fffbe6, #f59e0b, #b45309)',
    stroke: '#78350f',
    dur: '1.1s',
  },
  holo: {
    text: 'CHROMATIQUE!',
    gradient:
      'linear-gradient(120deg, #22d3ee, #a855f7, #f59e0b, #ec4899, #38bdf8, #22d3ee)',
    stroke: '#4c1d95',
    dur: '1.6s',
  },
}

function ImpactWord({
  text,
  kind,
  tone,
  centerX,
  centerY,
}: {
  text: string
  kind: ImpactKind
  tone: ReturnType<typeof getRarityTone>
  centerX: number
  centerY: number
}) {
  const base: CSSProperties = {
    position: 'fixed',
    left: centerX,
    top: centerY - 160,
    transform: 'translateX(-50%)',
    fontFamily: 'Impact, Arial Black, sans-serif',
    fontSize: '5.5rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    zIndex: 40,
  }
  if (kind === 'rarity') {
    return (
      <div
        style={{
          ...base,
          color: tone.hex,
          WebkitTextStroke: `3px ${tone.dark}`,
          textShadow: `3px 3px 0 ${tone.dark}, 6px 6px 0 ${tone.dark}, 9px 9px 0 rgba(0,0,0,0.35), -1px -1px 0 ${tone.dark}`,
        }}
      >
        {text}
      </div>
    )
  }
  const v = IMPACT_VARIANT[kind]
  return (
    <div
      style={{
        ...base,
        backgroundImage: v.gradient,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        WebkitTextStroke: `3px ${v.stroke}`,
        textShadow: '4px 4px 0 rgba(0,0,0,0.4)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
        animation: `impactSweep ${v.dur} linear infinite`,
      }}
    >
      {text}
    </div>
  )
}

function FullscreenRarityEffect({
  rarity,
  variant,
  centerX,
  centerY,
}: {
  rarity: CardRarity
  variant: string | null
  centerX: number
  centerY: number
}) {
  const effectKey = resolveEffectKey(rarity, variant)
  const { containerRef, canvasRefs, impactVisible, triggerReveal } =
    useRevealEffect(effectKey)
  const config = EFFECT_CONFIG[effectKey]
  const tone = getRarityTone(rarity)

  const kind: ImpactKind =
    effectKey === 'BRILLIANT'
      ? 'brilliant'
      : effectKey === 'HOLOGRAPHIC'
        ? 'holo'
        : 'rarity'
  const impactText =
    kind === 'rarity' ? config.impactText : IMPACT_VARIANT[kind].text

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
      {impactVisible && impactText && (
        <ImpactWord
          text={impactText}
          kind={kind}
          tone={tone}
          centerX={centerX}
          centerY={centerY}
        />
      )}
    </>
  )
}

// ── RevealCard ──────────────────────────────────────────────────────────────

type SpecialBadge = { label: string; Icon: typeof Sparkles; cls: string }

// All applicable badges on a revealed card, stacked top-to-bottom in this
// order: Nouveau, boostGuarantee, goldenBall, freePull. A pull can hold several
// at once (e.g. a new card that also rolled a golden ball), so each is shown
// rather than collapsing to a single priority badge. "Nouveau" is orthogonal to
// how the card was obtained — it flags any freshly-owned (non-duplicate) card.
function getSpecialBadges(entry: PullBatchEntry): SpecialBadge[] {
  const badges: SpecialBadge[] = []
  if (!entry.wasDuplicate) {
    badges.push({
      label: 'Nouveau',
      Icon: Star,
      cls: 'bg-emerald-500/95 shadow-emerald-600/40',
    })
  }
  if (entry.wasBoostGuarantee) {
    badges.push({
      label: 'EPIC garanti',
      Icon: Sparkles,
      cls: 'bg-violet-600/95 shadow-violet-700/40',
    })
  }
  if (entry.wasGoldenBall) {
    badges.push({
      label: "Boule d'or",
      Icon: Trophy,
      cls: 'bg-amber-500/95 shadow-amber-600/40',
    })
  }
  if (entry.wasFreePull) {
    badges.push({
      label: 'Gratuit',
      Icon: Gift,
      cls: 'bg-sky-500/95 shadow-sky-600/40',
    })
  }
  return badges
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

  const specialBadges = getSpecialBadges(entry)

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
                // "Nouveau" is rendered in the stacked badge group below (so it
                // coexists with Boule d'or / Gratuit) — not by CardDisplay here.
                newBadge={false}
              />
            </div>
            {specialBadges.length > 0 && (
              <div className="pointer-events-none absolute top-2 right-2 z-50 flex flex-col items-end gap-1">
                {specialBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${badge.cls}`}
                  >
                    <badge.Icon className="h-3 w-3" strokeWidth={2.5} />
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </button>
    </div>
  )
}
