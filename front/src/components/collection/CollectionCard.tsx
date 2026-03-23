import { RefreshCw } from 'lucide-react'

import type { Card } from '../../api/collection.api.ts'
import { Button } from '../ui/button.tsx'

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

export const RARITY_BG: Record<string, string> = {
  COMMON: 'from-border/10 to-transparent',
  UNCOMMON: 'from-green-500/10 to-transparent',
  RARE: 'from-accent/10 to-transparent',
  EPIC: 'from-secondary/10 to-transparent',
  LEGENDARY: 'from-primary/15 to-transparent',
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
}: {
  card: Card
  quantity: number
  isOwned: boolean
  onRecycle: (card: Card, quantity: number) => void
}) {
  const borderColor = isOwned
    ? (RARITY_COLORS[card.rarity]?.split(' ')[0] ?? 'border-border')
    : 'border-border/40'
  const rarityText = isOwned
    ? (RARITY_COLORS[card.rarity]?.split(' ')[1] ?? 'text-text-light')
    : 'text-text-light/30'
  const bg = isOwned
    ? (RARITY_BG[card.rarity] ?? 'from-border/10 to-transparent')
    : 'from-border/5 to-transparent'

  return (
    <div className="group relative">
      <div
        className={`relative flex flex-col rounded-xl border-2 ${borderColor} overflow-hidden bg-gradient-to-b ${bg} bg-muted/20 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${isOwned ? '' : 'opacity-50'}`}
      >
        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
          {quantity > 1 && (
            <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              ×{quantity}
            </span>
          )}
        </div>
        {card.variant && isOwned && (
          <div className="absolute top-1.5 left-1.5 z-10 text-xs leading-none">
            {card.variant === 'BRILLIANT' ? '✨' : '🌈'}
          </div>
        )}

        {/* Image avec padding — effet fenêtre de carte */}
        <div className="">
          <div className="relative aspect-3/4 w-full overflow-hidden bg-black/30 ring-1 ring-white/5">
            {isOwned ? (
              <img
                src={card.imageUrl ?? undefined}
                alt={card.name}
                className="h-full w-full object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <div
                  className="h-full w-full opacity-15"
                  style={{
                    backgroundImage: `url(${card.imageUrl})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'brightness(0)',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-2.5 py-2.5">
          <p
            className={`truncate text-[10px] font-bold tracking-wide ${rarityText}`}
          >
            {isOwned ? card.name : '???'}
          </p>
          <p
            className={`text-[8px] font-semibold uppercase tracking-widest ${rarityText} opacity-70`}
          >
            {isOwned ? RARITY_LABELS[card.rarity] : '·····'}
          </p>
        </div>

        {/* Hover — bouton recycler */}
        {quantity > 1 && (
          <div className="absolute bottom-0 left-0 right-0 hidden group-hover:flex justify-center pb-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => onRecycle(card, quantity)}
              className="gap-1.5 shadow-lg"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recycler
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
