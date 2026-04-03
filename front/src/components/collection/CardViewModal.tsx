import { RefreshCw, X } from 'lucide-react'

import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { RARITY_TCG_CONFIG, VARIANT_TCG_CONFIG } from '../shared/tcg-card/config.ts'
import { Button } from '../ui/button.tsx'
import {
  RARITY_CHIP_ACTIVE,
  RARITY_LABELS,
} from './CollectionCard.tsx'

type Props = {
  entry: DisplayEntry | null
  onClose: () => void
  onRecycle: () => void
}

export function CardViewModal({ entry, onClose, onRecycle }: Props) {
  if (!entry) return null

  const { card, variant, quantity, isOwned } = entry
  const config = RARITY_TCG_CONFIG[card.rarity] ?? RARITY_TCG_CONFIG.COMMON
  const variantInfo = variant !== 'NORMAL' ? VARIANT_TCG_CONFIG[variant] : null

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      {/* Rarity backdrop glow */}
      {config.backdropColor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: config.backdropColor }}
        />
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        className="flex flex-col items-center gap-5 px-4 py-8 animate-in fade-in-0 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <CardDisplay
          rarity={card.rarity}
          name={card.name}
          setName={card.set.name}
          imageUrl={card.imageUrl}
          variant={variant}
          isOwned={isOwned}
          interactive
        />

        {/* Info panel */}
        <div className="w-64 overflow-hidden rounded-2xl border border-white/9 bg-[rgba(6,6,12,0.78)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[20px]">
          {/* Name + set */}
          <div className="border-b border-white/6 px-4 py-3">
            <p className="text-base font-bold leading-tight text-white">
              {card.name}
            </p>
            <p className="mt-0.5 text-xs text-white/40">{card.set.name}</p>
          </div>

          {/* Rarity + variant badges */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/6 px-4 py-2.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RARITY_CHIP_ACTIVE[card.rarity] ?? ''}`}
            >
              {RARITY_LABELS[card.rarity]}
            </span>
            {variantInfo && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variantInfo.className}`}
              >
                {variantInfo.label}
              </span>
            )}
          </div>

          {/* Quantity */}
          {isOwned && (
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-2.5">
              <span className="text-xs text-white/45">Possédées</span>
              <span className="font-display text-base font-bold text-white/90">
                ×{quantity}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 p-3">
            {isOwned && quantity > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={onRecycle}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recycler
              </Button>
            )}
            <Button
              size="sm"
              className={isOwned && quantity > 1 ? 'flex-1' : 'w-full'}
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
