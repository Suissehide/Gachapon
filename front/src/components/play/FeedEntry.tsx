import { HoverCard } from 'radix-ui'

import { RARITY_TEXT_COLORS } from '../../constants/card.constant'
import type { FeedEntry } from '../../types/feed'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace'

const VARIANT_LABELS: Record<string, { symbol: string; cls: string }> = {
  BRILLIANT: { symbol: '✦', cls: 'text-amber-500' },
  HOLOGRAPHIC: { symbol: '◈', cls: 'text-cyan-500' },
}

type Props = {
  entry: FeedEntry
  index?: number
}

export function FeedEntryRow({ entry, index = 0 }: Props) {
  const rarityText = RARITY_TEXT_COLORS[entry.rarity] ?? 'text-text'
  const variant =
    entry.variant !== 'NORMAL' ? VARIANT_LABELS[entry.variant] : null
  const isLegendary = entry.rarity === 'LEGENDARY'

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <div
          className="flex items-baseline gap-1 px-2.5 py-[5px] rounded hover:bg-black/5 cursor-default select-none transition-colors duration-150"
          style={{
            animation: 'fadeIn 0.04s ease-out both',
            animationDelay: `${Math.min(index * 30, 600)}ms`,
          }}
        >
          <span className="shrink-0 max-w-[44px] truncate text-[9px] font-medium text-text-light/60 leading-none">
            {entry.username}
          </span>

          <span className="shrink-0 text-text-light/40 text-[9px] italic">
            a obtenu
          </span>

          <span
            className={`text-[11px] font-semibold truncate leading-none ${
              isLegendary ? 'legendary-text' : rarityText
            }`}
          >
            {entry.cardName}
          </span>

          {variant && (
            <span className={`shrink-0 text-[9px] leading-none ${variant.cls}`}>
              {variant.symbol}
            </span>
          )}
        </div>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side="left"
          sideOffset={10}
          className="z-50 rounded-xl overflow-hidden"
          style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.3))' }}
        >
          <div className="relative" style={{ width: 120, height: 180 }}>
            <TcgCardFace
              rarity={entry.rarity}
              name={entry.cardName}
              setName={entry.setName}
              imageUrl={entry.imageUrl}
              variant={entry.variant}
              compact
            />
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
