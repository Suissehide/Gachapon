import { Minus, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { useRecycle } from '../../queries/useCollection.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { RARITY_COLORS, RARITY_LABELS } from './CollectionCard.tsx'

const DUST_BY_RARITY: Record<string, number> = {
  COMMON: 5,
  UNCOMMON: 15,
  RARE: 50,
  EPIC: 150,
  LEGENDARY: 500,
}

interface RecycleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecycled?: () => void
  card: Card & { quantity: number }
  variant: CardVariant
}

export function RecycleModal({ open, onOpenChange, onRecycled, card, variant }: RecycleModalProps) {
  const [quantity, setQuantity] = useState(1)
  const { mutate: recycle, isPending } = useRecycle()

  const maxRecyclable = card.quantity - 1
  const dustPerCard = DUST_BY_RARITY[card.rarity] ?? 0
  const dustTotal = quantity * dustPerCard
  const rarityText = RARITY_COLORS[card.rarity]?.split(' ')[1] ?? 'text-text-light'

  const clamp = (v: number) => Math.max(1, Math.min(maxRecyclable, v))

  const handleInputChange = (e: { target: HTMLInputElement }): void => {
    const parsed = parseInt(e.target.value, 10)
    if (!Number.isNaN(parsed)) {
      setQuantity(clamp(parsed))
    }
  }

  const handleRecycle = () => {
    recycle(
      { cardId: card.id, quantity, variant },
      { onSuccess: () => { onOpenChange(false); onRecycled?.() } },
    )
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<RefreshCw className="h-4 w-4" />}>
            Recycler des cartes
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="space-y-5">
          {/* Card info */}
          <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 p-3">
            {card.imageUrl && (
              <div className="shrink-0 rounded-lg overflow-hidden border border-border/40 bg-black/30 w-12 h-16">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-text truncate">{card.name}</p>
              <p className={`text-xs font-medium ${rarityText}`}>
                {RARITY_LABELS[card.rarity]}
              </p>
              {variant !== 'NORMAL' && (
                <p className="mt-0.5 text-xs font-semibold">
                  {variant === 'HOLOGRAPHIC' ? '🌈 Holographique' : '✨ Brillante'}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-xs text-text-light">
                {dustPerCard} <Sparkles className="h-3 w-3 text-primary" /> par copie ·{' '}
                <span className="font-semibold text-text">{maxRecyclable}</span> exemplaire{maxRecyclable > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Quantity stepper */}
          <div className="space-y-2">
            <Label className="text-xs text-text-light">Quantité à recycler</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setQuantity(clamp(quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={maxRecyclable}
                value={quantity}
                onChange={handleInputChange}
                className="w-16 text-center"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setQuantity(clamp(quantity + 1))}
                disabled={quantity >= maxRecyclable}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuantity(maxRecyclable)}
                disabled={quantity === maxRecyclable}
                className="ml-1"
              >
                Tout ({maxRecyclable})
              </Button>
            </div>
          </div>

          {/* Dust preview */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest text-text-light/60 mb-1">
              Tu obtiendras
            </p>
            <p className="text-3xl font-black text-primary tabular-nums">
              {dustTotal.toLocaleString('fr-FR')}
              <Sparkles className="ml-1.5 inline h-6 w-6 text-primary" />
            </p>
            <p className="mt-1 text-[11px] text-text-light/50">
              {quantity} × {dustPerCard} dust · hors bonus multiplicateur
            </p>
          </div>
        </PopupBody>

        <PopupFooter className="flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleRecycle}
            disabled={isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isPending
              ? 'Recyclage…'
              : `Recycler ${quantity} carte${quantity > 1 ? 's' : ''}`}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
