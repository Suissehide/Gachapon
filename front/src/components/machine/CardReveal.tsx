import { useEffect, useRef } from 'react'

import type { PullResult } from '../../queries/useGacha'

const RARITY_STYLES = {
  COMMON: {
    border: 'border-border',
    glow: '',
    label: 'Commun',
    color: 'text-text-light',
  },
  UNCOMMON: {
    border: 'border-green-500/50',
    glow: 'shadow-green-500/30',
    label: 'Peu commun',
    color: 'text-green-400',
  },
  RARE: {
    border: 'border-accent/50',
    glow: 'shadow-accent/40',
    label: 'Rare',
    color: 'text-accent',
  },
  EPIC: {
    border: 'border-secondary/50',
    glow: 'shadow-secondary/40',
    label: 'Épique',
    color: 'text-secondary',
  },
  LEGENDARY: {
    border: 'border-primary/60',
    glow: 'shadow-primary/50',
    label: 'Légendaire',
    color: 'text-primary',
  },
}

const VARIANT_LABELS = {
  BRILLIANT: '✨ Brillant',
  HOLOGRAPHIC: '🌈 Holographique',
}

type Props = {
  result: PullResult | null
  onClose: () => void
}

export function CardReveal({ result, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) {
      dialogRef.current?.focus()
    }
  }, [result])

  if (!result) {
    return null
  }

  const style = RARITY_STYLES[result.card.rarity]

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close pattern
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`relative w-64 rounded-2xl border-2 ${style.border} bg-card p-6 shadow-2xl ${style.glow} animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Image de la carte */}
        <div className="mb-4 aspect-[3/4] w-full rounded-xl bg-muted flex items-center justify-center overflow-hidden">
          <img
            src={result.card.imageUrl}
            alt={result.card.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
            }}
          />
        </div>

        {/* Nom + rareté */}
        <h2 className="mb-1 text-lg font-black text-text">
          {result.card.name}
        </h2>
        <p className={`text-sm font-bold ${style.color}`}>{style.label}</p>
        {result.card.variant && (
          <p className="text-xs text-text-light">
            {VARIANT_LABELS[result.card.variant]}
          </p>
        )}

        {/* Doublon / dust */}
        {result.wasDuplicate && (
          <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
            <p className="text-xs font-semibold text-yellow-400">
              Doublon ! +{result.dustEarned} ✨ dust
            </p>
          </div>
        )}

        {/* Tokens restants */}
        <p className="mt-3 text-center text-xs text-text-light">
          {result.tokensRemaining} token
          {result.tokensRemaining !== 1 ? 's' : ''} restant
          {result.tokensRemaining !== 1 ? 's' : ''}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/80 transition-colors"
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
