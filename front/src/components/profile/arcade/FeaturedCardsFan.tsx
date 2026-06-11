// front/src/components/profile/arcade/FeaturedCardsFan.tsx
import { useState } from 'react'

import type { FeaturedCard } from '../../../api/profile.api'
import { CardArt } from './cardArt'
import type { ArcadeRarity } from './utils'

type Props = {
  cards: FeaturedCard[]
}

export function FeaturedCardsFan({ cards }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-[var(--arcade-border)] text-[var(--arcade-text-muted)] font-mono text-sm">
        Aucune carte encore — fais ton premier tirage.
      </div>
    )
  }

  return (
    <div className="relative flex justify-center items-end" style={{ minHeight: 280, paddingLeft: 40 }}>
      {cards.map((card, i) => {
        const rotation = (i - 2) * 5
        const offset = Math.abs(i - 2) * 10
        const isHovered = hovered === i
        const isDimmed = hovered !== null && hovered !== i
        return (
          <button
            key={card.id}
            type="button"
            className="w-[170px] transition-all duration-[350ms] text-left bg-transparent border-0 p-0"
            style={{
              transform: isHovered
                ? 'translateY(-26px) rotate(0deg) scale(1.06)'
                : `translateY(${offset}px) rotate(${rotation}deg)`,
              transformOrigin: '50% 100%',
              marginLeft: i === 0 ? 0 : -38,
              filter: isDimmed
                ? 'brightness(.65) saturate(.7)'
                : 'drop-shadow(0 14px 24px rgba(27,23,38,.18))',
              transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
              zIndex: isHovered ? 50 : i,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            aria-label={`${card.name} — ${card.rarity}`}
          >
            <CardArt
              rarity={card.rarity as ArcadeRarity}
              name={card.name}
              setName={card.setName}
              imageUrl={card.imageUrl}
            />
          </button>
        )
      })}
    </div>
  )
}
