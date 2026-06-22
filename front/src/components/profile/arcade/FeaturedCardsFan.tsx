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
      className="relative flex items-end justify-center"
      // Sized to fit inside an ArcadeHero with a 320px identity column
      // and 32px gap inside max-w-5xl (≈ 568px available). 5 cards × 130px
      // overlapping by 38px + small left pad → ~520px wide.
      style={{ minHeight: 240, paddingLeft: 28 }}
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
            className="w-[130px] transition-all duration-[350ms]"
            style={{
              transform: isHovered
                ? 'translateY(-26px) rotate(0deg) scale(1.06)'
                : `translateY(${offset}px) rotate(${rotation}deg)`,
              transformOrigin: '50% 100%',
              marginLeft: i === 0 ? 0 : -34,
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
