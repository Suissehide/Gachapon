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
}

export function FeedEntryRow({ entry }: Props) {
  const rarityText = RARITY_TEXT_COLORS[entry.rarity] ?? 'text-text'
  const variant = entry.variant !== 'NORMAL' ? VARIANT_LABELS[entry.variant] : null
  const isLegendary = entry.rarity === 'LEGENDARY'

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <div className="flex items-baseline gap-1 px-2.5 py-[5px] rounded hover:bg-black/5 cursor-default select-none transition-colors duration-150 animate-in slide-in-from-bottom-2 fade-in duration-300 fill-mode-both">
          <span className="shrink-0 max-w-[44px] truncate text-[9px] font-medium text-text-light/60 leading-none">
            {entry.username}
          </span>

          <span className="shrink-0 text-text-light/40 text-[9px] italic">a obtenu</span>

          <span
            className={`text-[11px] font-semibold truncate leading-none animate-in fade-in slide-in-from-bottom-1 duration-300 delay-75 fill-mode-both ${
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
