import { RefreshCw } from 'lucide-react'

import type { Card } from '../../api/collection.api.ts'

export const RARITY_ORDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'border-border text-text-light',
  UNCOMMON: 'border-green-500/40 text-green-400',
  RARE: 'border-accent/40 text-accent',
  EPIC: 'border-secondary/40 text-secondary',
  LEGENDARY: 'border-primary/50 text-primary',
}

export const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

export const RARITY_CHIP_INACTIVE: Record<string, string> = {
  COMMON: 'border-border/60 text-text-light/60',
  UNCOMMON: 'border-green-500/40 text-green-400/60',
  RARE: 'border-accent/40 text-accent/60',
  EPIC: 'border-secondary/40 text-secondary/60',
  LEGENDARY: 'border-primary/40 text-primary/60',
}

export const RARITY_CHIP_ACTIVE: Record<string, string> = {
  COMMON: 'border-border text-text-light bg-border/20',
  UNCOMMON: 'border-green-500 text-green-400 bg-green-500/10',
  RARE: 'border-accent text-accent bg-accent/10',
  EPIC: 'border-secondary text-secondary bg-secondary/10',
  LEGENDARY: 'border-primary text-primary bg-primary/10',
}

export function CollectionCard({
  card,
  quantity,
  isOwned,
  onRecycle,
  recycling,
}: {
  card: Card
  quantity: number
  isOwned: boolean
  onRecycle: () => void
  recycling: boolean
}) {
  return (
    <div className="group relative">
      <div
        className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-transform duration-200 group-hover:-translate-y-0.5 ${
          isOwned
            ? (RARITY_COLORS[card.rarity]?.split(' ')[0] ?? 'border-border')
            : 'border-border'
        }`}
      >
        {isOwned ? (
          <img
            src={card.imageUrl ?? undefined}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="h-full w-full bg-muted/40 flex items-center justify-center">
            <div
              className="h-3/4 w-full opacity-20"
              style={{
                backgroundImage: `url(${card.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0)',
              }}
            />
          </div>
        )}

        {quantity > 1 && (
          <div className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ×{quantity}
          </div>
        )}

        {card.variant && isOwned && (
          <div className="absolute top-1 left-1 text-xs">
            {card.variant === 'BRILLIANT' ? '✨' : '🌈'}
          </div>
        )}
      </div>

      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-semibold text-text-light">
          {isOwned ? card.name : '???'}
        </p>
      </div>

      {quantity > 1 && (
        <button
          type="button"
          onClick={onRecycle}
          disabled={recycling}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-yellow-400 hover:bg-black transition-colors"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Recycler
        </button>
      )}
    </div>
  )
}
