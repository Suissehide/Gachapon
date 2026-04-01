import { RefreshCw } from 'lucide-react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
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

export const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
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
  variant,
  quantity,
  isOwned,
  onRecycle,
  onClick,
}: {
  card: Card
  variant: CardVariant
  quantity: number
  isOwned: boolean
  onRecycle: () => void
  onClick: () => void
}) {
  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      {/* aspect-3/4 wrapper positions TcgCardFace via absolute inset-0 */}
      <div
        className="relative aspect-3/4 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg"
        style={{ borderRadius: 10 }}
      >
        <TcgCardFace
          rarity={card.rarity}
          name={card.name}
          setName={card.set.name}
          imageUrl={card.imageUrl}
          variant={variant}
          isOwned={isOwned}
          compact
        />

        {/* Quantity badge */}
        {quantity > 1 && (
          <div className="absolute right-1.5 top-1.5 z-20">
            <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              ×{quantity}
            </span>
          </div>
        )}

        {/* Hover — recycle button */}
        {quantity > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-20 hidden justify-center pb-2 group-hover:flex">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation()
                onRecycle()
              }}
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
