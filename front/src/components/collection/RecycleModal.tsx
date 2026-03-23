import { useState } from 'react'

import type { Card } from '../../api/collection.api.ts'
import { useRecycle } from '../../queries/useCollection.ts'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

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
  card: Card & { quantity: number }
}

export function RecycleModal({ open, onOpenChange, card }: RecycleModalProps) {
  const [inputValue, setInputValue] = useState('1')
  const { mutate: recycle, isPending } = useRecycle()

  const maxRecyclable = card.quantity
  const parsed = parseInt(inputValue, 10)
  const quantity = Number.isNaN(parsed) ? 0 : parsed
  const isValid = quantity >= 1 && quantity <= maxRecyclable
  const dustPreview = isValid ? quantity * (DUST_BY_RARITY[card.rarity] ?? 0) : 0

  const handleRecycle = () => {
    if (!isValid) return
    recycle(
      { cardId: card.id, quantity },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle>Recycler des cartes</PopupTitle>
        </PopupHeader>

        <PopupBody className="space-y-4">
          {/* Card info */}
          <div className="flex items-center gap-3">
            {card.imageUrl && (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="h-14 w-10 rounded-lg object-contain border border-border/40"
              />
            )}
            <div>
              <p className="font-semibold text-text">{card.name}</p>
              <p className="text-xs text-text-light">
                {card.rarity} · {DUST_BY_RARITY[card.rarity] ?? 0} 💎 / copie
              </p>
              <p className="text-xs text-text-light">
                Tu possèdes{' '}
                <span className="font-semibold text-text">{card.quantity}</span> exemplaire
                {card.quantity > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Quantity input */}
          <div className="space-y-1">
            <label className="text-xs text-text-light">Quantité à recycler</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={maxRecyclable}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-24 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setInputValue(String(maxRecyclable))}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-light hover:border-primary hover:text-primary transition-colors"
              >
                Tout ({maxRecyclable})
              </button>
            </div>
            <p className="text-[10px] text-text-light/60">
              Min 1 · Max {maxRecyclable}
            </p>
          </div>

          {/* Dust preview */}
          {isValid && (
            <div className="rounded-lg bg-muted/60 p-3 text-center">
              <p className="text-xs text-text-light">Tu obtiendras (hors bonus)</p>
              <p className="text-lg font-bold text-yellow-400">
                {dustPreview.toLocaleString()} 💎
              </p>
              <p className="text-[10px] text-text-light/60">
                {quantity} × {DUST_BY_RARITY[card.rarity] ?? 0} dust
              </p>
            </div>
          )}
        </PopupBody>

        <PopupFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text-light hover:border-primary hover:text-primary transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleRecycle}
            disabled={!isValid || isPending}
            className="flex-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isPending ? 'Recyclage…' : `Recycler ${isValid ? quantity : ''} carte${quantity > 1 ? 's' : ''}`}
          </button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
