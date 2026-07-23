import { Sparkles, Star, Swords } from 'lucide-react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { describePassive } from '../../constants/passives.constant.ts'
import { useCardEquipmentBonuses } from '../../queries/useEquipment.ts'
import { computePower, finalStatWithBonuses } from '../../utils/cardStats.ts'
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
  RARE: 'border-blue-500/40 text-blue-400',
  EPIC: 'border-violet-500/40 text-violet-400',
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
  RARE: 'border-blue-500 text-blue-400 bg-blue-500/10',
  EPIC: 'border-violet-500 text-violet-400 bg-violet-500/10',
  LEGENDARY: 'border-primary text-primary bg-primary/10',
}

type Props = {
  card: Card
  variant: CardVariant
  quantity: number
  isOwned: boolean
  // Identifiant de la carte possédée : sert à récupérer ses bonus d'équipement
  // pour que la puissance affichée corresponde au panneau de détail.
  userCardId?: string | null
  level?: number | null
  palier?: number | null
  isNew?: boolean
  isWishlisted?: boolean
  onClick: () => void
}

export function CollectionCard({
  card,
  variant,
  quantity,
  isOwned,
  userCardId,
  level,
  palier,
  isNew,
  isWishlisted,
  onClick,
}: Props) {
  // Bonus d'équipement de cette carte (vides si non possédée ou si l'équipement
  // n'est pas le nôtre — ex. collection d'un autre joueur).
  const bonuses = useCardEquipmentBonuses(userCardId ?? '')
  const stats: CardStats | null =
    isOwned && level && palier
      ? {
          pv: Math.round(
            finalStatWithBonuses(
              card.baseHp,
              level,
              variant,
              palier,
              bonuses.hp,
            ),
          ),
          atq: Math.round(
            finalStatWithBonuses(
              card.baseAtk,
              level,
              variant,
              palier,
              bonuses.atk,
            ),
          ),
          def: Math.round(
            finalStatWithBonuses(
              card.baseDef,
              level,
              variant,
              palier,
              bonuses.def,
            ),
          ),
          vit: Math.round(
            finalStatWithBonuses(
              card.baseSpd,
              level,
              variant,
              palier,
              bonuses.spd,
            ),
          ),
        }
      : null

  const power =
    stats !== null
      ? computePower({
          hp: stats.pv,
          atk: stats.atq,
          def: stats.def,
          spd: stats.vit,
        })
      : null

  const description =
    isOwned && palier ? describePassive(card.passiveKey, palier) : null

  return (
    <button
      type="button"
      className="group relative block w-full cursor-pointer text-left transition-transform duration-200 hover:-translate-y-1 hover:z-[2]"
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

        {isOwned && power !== null && (
          <span className="pointer-events-none absolute top-1.5 left-1/2 z-[6] inline-flex -translate-x-1/2 items-center gap-1 rounded-sm border-[0.5px] border-white bg-[#1b1726]/92 px-2 py-[3px] font-display text-[10px] font-extrabold leading-none tabular-nums text-white shadow-[0_2px_6px_rgba(27,23,38,0.45)]">
            <Swords className="h-2.5 w-2.5 text-primary" />
            {power.toLocaleString('fr-FR')}
          </span>
        )}

        {isOwned && isNew && (
          <span className="absolute -left-2 -top-2 z-[6] inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#34d399,#16a34a)] px-[10px] py-[5px] font-mono text-[9.5px] font-extrabold leading-none tracking-[0.1em] text-white shadow-[0_5px_14px_-3px_rgba(22,163,74,0.65),0_0_0_2px_#fcfbf9]">
            <Sparkles className="h-2.5 w-2.5" />
            NOUVEAU
          </span>
        )}

        {isWishlisted && (
          <span
            title="Vœu actif"
            className="absolute -left-1.5 -top-1.5 z-[6] inline-flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fbbf24,#d97706)] text-white shadow-[0_3px_8px_rgba(217,119,6,0.5),0_0_0_1.5px_#fcfbf9]"
          >
            <Star className="h-3 w-3" fill="currentColor" />
          </span>
        )}

        {isOwned && quantity > 1 && (
          <span className="absolute -right-1.5 -top-1.5 z-[6] inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1b1726] font-display text-[10px] font-extrabold leading-none text-white shadow-[0_3px_8px_rgba(27,23,38,0.4),0_0_0_1.5px_#fcfbf9]">
            ×{quantity}
          </span>
        )}
      </div>
    </button>
  )
}
