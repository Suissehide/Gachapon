import { useState } from 'react'

import type { FeaturedCard } from '../../../api/profile.api'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'

type Props = {
  cards: FeaturedCard[]
}

export function FeaturedCardsFan({ cards }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-border text-text-light font-mono text-sm">
        Aucune carte encore — fais ton premier tirage.
      </div>
    )
  }

  return (
    <div
      // Card width / overlap / left-pad are driven by CSS variables so the fan
      // shrinks to fit a phone (≈340px) and expands on ≥sm inside the ArcadeHero
      // (5 cards × 130px overlapping by 34px + left pad → ~520px wide).
      className="relative flex items-end justify-center min-h-[180px] [--fan-card-w:86px] [--fan-overlap:-26px] [--fan-pad:12px] sm:min-h-[240px] sm:[--fan-card-w:130px] sm:[--fan-overlap:-34px] sm:[--fan-pad:28px]"
      style={{ paddingLeft: 'var(--fan-pad)' }}
    >
      {cards.map((card, i) => {
        const rotation = (i - 2) * 5
        const offset = Math.abs(i - 2) * 10
        const isHovered = hovered === i
        const isDimmed = hovered !== null && hovered !== i
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover-only decorative fan, keyboard nav not required
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label kept for screen readers describing the hovered card
          <div
            key={card.id}
            className="w-[var(--fan-card-w)] transition-all duration-[350ms]"
            style={{
              transform: isHovered
                ? 'translateY(-26px) rotate(0deg) scale(1.06)'
                : `translateY(${offset}px) rotate(${rotation}deg)`,
              transformOrigin: '50% 100%',
              marginLeft: i === 0 ? 0 : 'var(--fan-overlap)',
              filter: isDimmed
                ? 'brightness(.65) saturate(.7)'
                : 'drop-shadow(0 14px 24px rgba(27,23,38,.18))',
              transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
              zIndex: isHovered ? 50 : i,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${card.name} — ${card.rarity}`}
          >
            <CardDisplay
              rarity={card.rarity}
              name={card.name}
              setName={card.setName}
              imageUrl={card.imageUrl}
              variant={card.variant}
              interactive={false}
              compact
            />
          </div>
        )
      })}
    </div>
  )
}
