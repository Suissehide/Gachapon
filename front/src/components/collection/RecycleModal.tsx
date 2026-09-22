import { Minus, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { useRecycle } from '../../queries/useCollection.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
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

interface RecycleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecycled?: () => void
  card: Card & { quantity: number }
  variant: CardVariant
}

export function RecycleModal({
  open,
  onOpenChange,
  onRecycled,
  card,
  variant,
}: RecycleModalProps) {
  const { t } = useTranslation('collection')
  const [quantity, setQuantity] = useState(1)
  const { mutate: recycle, isPending } = useRecycle()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const locale = currentLocale()
  const maxRecyclable = card.quantity - 1
  const dustPerCard = economy.recycle[card.rarity] ?? 0
  const dustTotal = quantity * dustPerCard
  const rarityText =
    RARITY_COLORS[card.rarity]?.split(' ')[1] ?? 'text-text-light'

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
      {
        onSuccess: () => {
          onOpenChange(false)
          onRecycled?.()
        },
      },
    )
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<RefreshCw className="h-4 w-4" />}>
            {t('collection:recycleModal.title')}
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
                  {variant === 'HOLOGRAPHIC'
                    ? t('collection:recycleModal.variantHolographic')
                    : t('collection:recycleModal.variantBrilliant')}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1 text-xs text-text-light">
                {dustPerCard} <Sparkles className="h-3 w-3 text-primary" />{' '}
                {t('collection:recycleModal.perCopy')} ·{' '}
                <span className="font-semibold text-text">{maxRecyclable}</span>{' '}
                {t('collection:recycleModal.copiesAvailable', {
                  count: maxRecyclable,
                })}
              </p>
            </div>
          </div>

          {/* Quantity stepper */}
          <div className="space-y-2">
            <Label className="text-xs text-text-light">
              {t('collection:recycleModal.quantityLabel')}
            </Label>
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
                {t('collection:recycleModal.all', { count: maxRecyclable })}
              </Button>
            </div>
          </div>

          {/* Dust preview */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest text-text-light/60 mb-1">
              {t('collection:recycleModal.youWillGet')}
            </p>
            <p className="text-3xl font-black text-primary tabular-nums">
              {formatNumber(dustTotal, locale)}
              <Sparkles className="ml-1.5 inline h-6 w-6 text-primary" />
            </p>
            <p className="mt-1 text-[11px] text-text-light/50">
              {t('collection:recycleModal.dustBreakdown', {
                quantity,
                dustPerCard,
              })}
            </p>
          </div>
        </PopupBody>

        <PopupFooter className="flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {t('collection:recycleModal.cancel')}
          </Button>
          <Button type="button" onClick={handleRecycle} disabled={isPending}>
            <RefreshCw className="h-3.5 w-3.5" />
            {isPending
              ? t('collection:recycleModal.pending')
              : t('collection:recycleModal.confirm', { count: quantity })}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
