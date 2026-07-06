import dayjs from 'dayjs'
import { HoverCard } from 'radix-ui'

import { RARITY_TEXT_COLORS } from '../../constants/card.constant'
import type { FeedEntry } from '../../types/feed'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace'

const VARIANT_TAGS: Record<string, { label: string; cls: string }> = {
  BRILLIANT: {
    label: 'DORÉ',
    cls: 'border-primary/40 bg-primary/10 text-primary-dark',
  },
  HOLOGRAPHIC: {
    label: 'HOLO',
    cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600',
  },
}

const RARITY_DOT: Record<string, string> = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
}

type Props = {
  entry: FeedEntry
  index?: number
}

export function FeedEntryRow({ entry, index = 0 }: Props) {
  const rarityText = RARITY_TEXT_COLORS[entry.rarity] ?? 'text-text'
  const variant =
    entry.variant !== 'NORMAL' ? VARIANT_TAGS[entry.variant] : null
  const isLegendary = entry.rarity === 'LEGENDARY'

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <div
          className="flex items-center gap-2 border-b border-border/70 px-0.5 py-2 last:border-b-0 cursor-default select-none"
          style={{
            animation: 'fadeIn 0.04s ease-out both',
            animationDelay: `${Math.min(index * 30, 600)}ms`,
          }}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: RARITY_DOT[entry.rarity] ?? 'var(--text-light)',
              boxShadow: `0 0 0 3px color-mix(in oklab, ${RARITY_DOT[entry.rarity] ?? 'transparent'} 16%, transparent)`,
            }}
          />
          <span className="min-w-0 flex-1 leading-tight">
            <span
              className={`block truncate text-[13px] font-semibold ${
                isLegendary ? 'legendary-text' : rarityText
              }`}
            >
              {entry.cardName}
            </span>
            <span className="block truncate text-[9px] text-text-light/60">
              {entry.username}
            </span>
          </span>
          {variant && (
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.1em] ${variant.cls}`}
            >
              {variant.label}
            </span>
          )}
          <span className="shrink-0 font-mono text-[9px] text-text-light/60">
            {dayjs(entry.pulledAt).fromNow(true)}
          </span>
        </div>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side="left"
          sideOffset={10}
          className="z-50"
          style={{ filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.3))' }}
        >
          <div className="relative w-[120px] aspect-[2/3]">
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
