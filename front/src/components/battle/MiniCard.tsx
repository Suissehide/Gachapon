import { Swords } from 'lucide-react'

import type { TeamUnit } from '../../api/combat.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { computePower } from '../../utils/cardStats.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ── Mini card (used in dock + prep modal) ────────────────────────────────────
// Uses `TcgCardFace` for real card art + rarity frame. Width controls tile
// size; TcgCardFace fills its aspect-2/3 container. Rarity tone drives the
// level badge overlay so it inherits the card frame colours.
// When `showName` is false the family + name band are hidden and a power pill
// overlays the bottom instead — used by the dock where names would be noise.

export function MiniCard({
  unit,
  width,
  showName = true,
}: {
  unit: TeamUnit
  width: string
  showName?: boolean
}) {
  const power = computePower(unit.stats)
  return (
    <div className={`relative aspect-[2/3] ${width}`}>
      <TcgCardFace
        rarity={unit.rarity}
        name={unit.cardName}
        setName=""
        imageUrl={unit.cardImageUrl}
        variant={unit.variant}
        isOwned
        compact
        showName={showName}
        // Niveau ET élément confiés à la carte : elle les empile en colonne,
        // le niveau puis l'élément dessous. MiniCard dessinait auparavant son
        // propre badge de niveau au même endroit, si bien que l'élément
        // passait par-dessus.
        level={unit.level}
        element={(unit.element ?? null) as CardElement | null}
      />
      {!showName && (
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-sm border-[0.5px] border-white bg-[#1b1726]/92 px-2 py-[3px] font-display text-[10px] font-extrabold leading-none tabular-nums text-white shadow-[0_2px_6px_rgba(27,23,38,0.45)]">
          <Swords className="h-2.5 w-2.5 text-primary" />
          {fmt(power)}
        </div>
      )}
    </div>
  )
}
