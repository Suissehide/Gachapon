import type { Card, CardVariant } from '../../api/collection.api.ts'
import { describePassive } from '../../constants/passives.constant.ts'
import { finalStat } from '../../utils/cardStats.ts'
import type { CardStats } from '../shared/tcg-card/TcgCardFace.tsx'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'

export const RARITY_ORDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'border-border text-text-light',
  UNCOMMON: 'border-green-500/40 text-green-400',
  RARE: 'border-accent/40 text-accent',
  EPIC: 'border-secondary/40 text-secondary',
  LEGENDARY: 'border-primary/50 text-primary',
}

export const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

export const RARITY_CHIP_ACTIVE: Record<string, string> = {
  COMMON: 'border-border text-text-light bg-border/20',
  UNCOMMON: 'border-green-500 text-green-400 bg-green-500/10',
  RARE: 'border-accent text-accent bg-accent/10',
  EPIC: 'border-secondary text-secondary bg-secondary/10',
  LEGENDARY: 'border-primary text-primary bg-primary/10',
}

export function CollectionCard({
  card,
  variant,
  quantity,
  isOwned,
  level,
  palier,
  onClick,
}: {
  card: Card
  variant: CardVariant
  quantity: number
  isOwned: boolean
  level?: number | null
  palier?: number | null
  onClick: () => void
}) {
  const stats: CardStats | null =
    isOwned && level && palier
      ? {
          pv: Math.round(finalStat(card.baseHp, level, variant, palier)),
          atq: Math.round(finalStat(card.baseAtk, level, variant, palier)),
          def: Math.round(finalStat(card.baseDef, level, variant, palier)),
          vit: Math.round(finalStat(card.baseSpd, level, variant, palier)),
        }
      : null

  const description =
    isOwned && palier ? describePassive(card.passiveKey, palier) : null

  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <div className="relative aspect-3/4 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <TcgCardFace
          rarity={card.rarity}
          name={card.name}
          setName={card.set.name}
          imageUrl={card.imageUrl}
          variant={variant}
          isOwned={isOwned}
          compact
          level={level ?? null}
          stats={stats}
          description={description}
        />

        {/* Quantity badge */}
        {quantity > 1 && (
          <div className="absolute right-1.5 top-1.5 z-30">
            <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              ×{quantity}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
