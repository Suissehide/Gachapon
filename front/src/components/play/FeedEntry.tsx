import { HoverCard } from 'radix-ui'

import { RARITY_TEXT_COLORS } from '../../constants/card.constant'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace'
import type { FeedEntry } from '../../types/feed'

const VARIANT_LABELS: Record<string, string> = {
  BRILLIANT: '✦',
  HOLOGRAPHIC: '◈',
}

type Props = {
  entry: FeedEntry
}

export function FeedEntryRow({ entry }: Props) {
  const rarityClass = RARITY_TEXT_COLORS[entry.rarity] ?? 'text-white'
  const variantLabel = entry.variant !== 'NORMAL' ? VARIANT_LABELS[entry.variant] : null

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <div className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-white/5 cursor-default animate-in slide-in-from-top-2 duration-200 select-none">
          <span className="shrink-0 max-w-[52px] truncate text-text-light/40 text-[10px]">
            {entry.username}
          </span>
          <span className={`font-semibold truncate ${rarityClass}`}>
            {entry.cardName}
          </span>
          {variantLabel && (
            <span className="shrink-0 text-[9px] text-sky-300">{variantLabel}</span>
          )}
        </div>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="left"
          sideOffset={8}
          className="z-50 rounded-xl overflow-hidden"
          style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}
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
