import { Sparkles } from 'lucide-react'

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

const VARIANT_TAGS: Record<string, { label: string; className: string }> = {
  HOLOGRAPHIC: {
    label: 'HOLO',
    className:
      'bg-[linear-gradient(90deg,#f9a8d4,#93c5fd,#86efac,#fcd34d)] text-[#1b1726]',
  },
  BRILLIANT: {
    label: 'DORÉ',
    className:
      'bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-[#5b3a00]',
  },
}

type Props = {
  card: Card
  variant: CardVariant
  quantity: number
  isOwned: boolean
  level?: number | null
  palier?: number | null
  isNew?: boolean
  onClick: () => void
}

export function CollectionCard({
  card,
  variant,
  quantity,
  isOwned,
  level,
  palier,
  isNew,
  onClick,
}: Props) {
  const variantTag =
    isOwned && variant !== 'NORMAL' ? VARIANT_TAGS[variant] : null

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
    <div
      className="group relative cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:z-[2]"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3]">
        <TcgCardFace
          rarity={card.rarity}
          name={card.name}
          setName={card.set.name}
          imageUrl={card.imageUrl}
          variant={variant}
          isOwned={isOwned}
          compact
          level={isOwned ? (level ?? null) : null}
          stats={isOwned ? stats : null}
          description={isOwned ? description : null}
        />

        {/* Overlays for owned cards */}
        {isOwned && variantTag && (
          <span
            className={`absolute left-1/2 top-2.5 z-[6] -translate-x-1/2 rounded-full px-2.5 py-1 font-mono text-[9px] font-extrabold tracking-[0.16em] ${variantTag.className}`}
          >
            {variantTag.label}
          </span>
        )}

        {isOwned && isNew && (
          <span className="absolute -left-2 -top-2 z-[6] inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#34d399,#16a34a)] px-[10px] py-[5px] font-mono text-[9.5px] font-extrabold leading-none tracking-[0.1em] text-white shadow-[0_5px_14px_-3px_rgba(22,163,74,0.65),0_0_0_2px_#fcfbf9]">
            <Sparkles className="h-2.5 w-2.5" />
            NOUVEAU
          </span>
        )}

        {isOwned && quantity > 1 && (
          <span className="absolute -right-1.5 -top-1.5 z-[6] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b1726] px-1 font-display text-[10px] font-extrabold leading-none text-white shadow-[0_3px_8px_rgba(27,23,38,0.4),0_0_0_1.5px_#fcfbf9]">
            ×{quantity}
          </span>
        )}
      </div>
    </div>
  )
}
