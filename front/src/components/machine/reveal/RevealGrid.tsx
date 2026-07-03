import { useEffect, useMemo, useState } from 'react'
import cardBackImg from '../../../assets/data/card-back/black.png'
import type { CardRarity } from '../../../constants/card.constant'
import type { PullBatchEntry } from '../../../queries/useGacha'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'
import { NewDupChip } from './NewDupChip'
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
  onAllRevealed: () => void
}

export function RevealGrid({ results, onAllRevealed }: Props) {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())
  const [revealAllTriggered, setRevealAllTriggered] = useState(false)

  // Pre-compute stable keys so no iterator index appears in JSX key prop
  const stableResults = useMemo(
    () => results.map((entry, i) => ({ entry, key: `${i}-${entry.card.id}`, idx: i })),
    [results],
  )

  const flipCard = (idx: number) => {
    setFlipped((prev) => {
      if (prev.has(idx)) { return prev }
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  const revealAll = () => {
    if (revealAllTriggered) { return }
    setRevealAllTriggered(true)
    const remaining = results
      .map((r, i) => ({ i, rank: RARITY_RANK[r.card.rarity] ?? 0 }))
      .filter(({ i }) => !flipped.has(i))
      .sort((a, b) => a.rank - b.rank)
    remaining.forEach(({ i }, order) => {
      setTimeout(() => flipCard(i), order * 150)
    })
  }

  useEffect(() => {
    if (flipped.size === results.length) {
      const timer = setTimeout(() => onAllRevealed(), 700)
      return () => clearTimeout(timer)
    }
  }, [flipped.size, results.length, onAllRevealed])

  const isSingle = results.length === 1

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md'>
      <div
        className={
          isSingle
            ? 'flex items-center justify-center'
            : 'grid grid-cols-5 max-md:grid-cols-2 gap-4 p-8'
        }
      >
        {stableResults.map(({ entry, key, idx }) => (
          <RevealCard
            key={key}
            entry={entry}
            index={idx}
            flipped={flipped.has(idx)}
            onFlip={() => flipCard(idx)}
            size={isSingle ? 'lg' : 'sm'}
          />
        ))}
      </div>
      {flipped.size < results.length && !revealAllTriggered && (
        <button
          type='button'
          onClick={revealAll}
          className='mt-8 rounded-full bg-linear-to-r from-primary to-secondary px-6 py-2 text-sm font-black uppercase tracking-widest text-white shadow-lg'
        >
          Tout révéler
        </button>
      )}
    </div>
  )
}

// ── RevealCard ──────────────────────────────────────────────────────────────

type CardProps = {
  entry: PullBatchEntry
  index: number
  flipped: boolean
  onFlip: () => void
  size: 'lg' | 'sm'
}

function RevealCard({ entry, flipped, onFlip, size }: CardProps) {
  const rarity = entry.card.rarity as CardRarity
  const { containerRef, canvasRefs, impactVisible, triggerReveal, reset } =
    useRevealEffect(rarity, { scoped: true })
  const effectConfig = RARITY_CONFIG[rarity]
  const [showChip, setShowChip] = useState(false)

  useEffect(() => {
    if (flipped) {
      triggerReveal()
      const chipTimer = setTimeout(() => setShowChip(true), 500)
      return () => clearTimeout(chipTimer)
    }
    reset()
    setShowChip(false)
  }, [flipped, triggerReveal, reset])

  const dimensions = size === 'lg' ? 'w-64 h-90' : 'w-32 h-45'

  return (
    <div className={`relative ${dimensions}`} ref={containerRef}>
      <RevealCanvases refs={canvasRefs} scoped />
      {flipped && impactVisible && effectConfig.impactText && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -30,
            transform: 'translateX(-50%)',
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontSize: size === 'lg' ? '3rem' : '1.5rem',
            color: effectConfig.impactColor,
            WebkitTextStroke: `2px ${effectConfig.impactStroke}`,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {effectConfig.impactText}
        </div>
      )}
      <button
        type='button'
        onClick={flipped ? undefined : onFlip}
        className='h-full w-full [perspective:1000px] disabled:cursor-default'
        disabled={flipped}
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          } ${flipped ? '' : 'hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'}`}
        >
          {/* Face cachée */}
          <div className='absolute inset-0 [backface-visibility:hidden]'>
            <img
              src={cardBackImg}
              alt='dos de carte'
              className='h-full w-full rounded-2xl object-cover'
            />
          </div>
          {/* Face révélée */}
          <div className='absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]'>
            <CardDisplay
              rarity={rarity}
              name={entry.card.name}
              setName={entry.card.set.name}
              imageUrl={entry.card.imageUrl}
              variant={entry.card.variant}
              interactive={false}
            />
            {showChip && <NewDupChip wasDuplicate={entry.wasDuplicate} />}
          </div>
        </div>
      </button>
    </div>
  )
}
