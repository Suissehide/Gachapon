import { Recycle, X } from 'lucide-react'
import type { CSSProperties } from 'react'

import { describePassive } from '../../constants/passives.constant.ts'
import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { finalStat } from '../../utils/cardStats.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import type { CardStats } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { RARITY_LABELS } from './CollectionCard.tsx'
import { CombatPanel } from './CombatPanel.tsx'
import { EquipmentSlotsPanel } from './EquipmentSlotsPanel.tsx'

type Props = {
  entry: DisplayEntry | null
  onClose: () => void
  onRecycle: () => void
}

const RARITY_HEX: Record<string, string> = {
  COMMON: '#22c55e',
  UNCOMMON: '#3b82f6',
  RARE: '#8b5cf6',
  EPIC: '#ec4899',
  LEGENDARY: '#f59e0b',
}

const VARIANT_LABELS: Record<string, { label: string; className: string }> = {
  BRILLIANT: {
    label: 'Brillant',
    className: 'bg-amber-400/25 border border-amber-500/50 text-amber-700',
  },
  HOLOGRAPHIC: {
    label: 'Holographique',
    className: 'bg-cyan-400/20 border border-cyan-500/40 text-cyan-700',
  },
}

export function CardViewModal({ entry, onClose, onRecycle }: Props) {
  if (!entry) {
    return null
  }

  const { card, variant, quantity, isOwned, userCard } = entry
  const rarityHex = RARITY_HEX[card.rarity] ?? RARITY_HEX.COMMON
  const variantInfo = variant !== 'NORMAL' ? VARIANT_LABELS[variant] : null

  const panelStyle = { '--rar': rarityHex } as CSSProperties

  const stats: CardStats | null =
    isOwned && userCard
      ? {
          pv: Math.round(
            finalStat(card.baseHp, userCard.level, variant, userCard.palier),
          ),
          atq: Math.round(
            finalStat(card.baseAtk, userCard.level, variant, userCard.palier),
          ),
          def: Math.round(
            finalStat(card.baseDef, userCard.level, variant, userCard.palier),
          ),
          vit: Math.round(
            finalStat(card.baseSpd, userCard.level, variant, userCard.palier),
          ),
        }
      : null

  const description =
    isOwned && userCard
      ? describePassive(card.passiveKey, userCard.palier)
      : null

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-[100] overflow-y-auto bg-black/55 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div
          className="flex flex-wrap items-center justify-center gap-8 animate-in fade-in-0 zoom-in-95 duration-300 md:gap-10"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <CardDisplay
            rarity={card.rarity}
            name={card.name}
            setName={card.set.name}
            imageUrl={card.imageUrl}
            variant={variant}
            isOwned={isOwned}
            interactive
            large
            level={userCard?.level ?? null}
            stats={stats}
            description={description}
          />

          <Card
            className="flex w-full max-w-[400px] flex-col rounded-[22px] border-[rgba(27,23,38,0.06)] p-6 shadow-[0_2px_0_rgba(27,23,38,0.03),0_30px_60px_-28px_rgba(27,23,38,0.4)] md:w-[400px]"
            style={panelStyle}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col items-start gap-1">
                <h2 className="font-display text-2xl font-extrabold leading-none -tracking-[0.02em] text-text">
                  {card.name}
                </h2>
                <p className="text-[13px] leading-tight text-text-light">
                  {card.set.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="whitespace-nowrap rounded-full border px-2.75 py-1.25 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{
                      color: rarityHex,
                      backgroundColor: `color-mix(in oklab, ${rarityHex} 14%, white)`,
                      borderColor: `color-mix(in oklab, ${rarityHex} 45%, transparent)`,
                    }}
                  >
                    {RARITY_LABELS[card.rarity]}
                  </span>
                  {variantInfo && (
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variantInfo.className}`}
                    >
                      {variantInfo.label}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 rounded-[10px] bg-[rgba(27,23,38,0.06)] text-[rgba(27,23,38,0.55)] hover:bg-[rgba(27,23,38,0.12)] hover:text-text"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Meta — Owned + inline recycle */}
            {isOwned && (
              <div className="mt-[14px] flex items-center justify-between border-y border-[rgba(27,23,38,0.08)] py-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] text-text-light">
                    Possédées
                  </span>
                  <b className="font-display text-xl font-extrabold tabular-nums text-text">
                    ×{quantity}
                  </b>
                </div>
                {quantity > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRecycle}
                    className="h-auto rounded-[11px] border-[rgba(27,23,38,0.14)] bg-card px-[15px] py-[9px] text-[13.5px] font-semibold text-[rgba(27,23,38,0.7)] hover:bg-surface-2 hover:text-text"
                  >
                    <Recycle className="h-[15px] w-[15px]" />
                    Recycler
                  </Button>
                )}
              </div>
            )}

            {/* Combat (stats, level/palier, level-up, ascend, passive) */}
            {isOwned && entry.userCard && (
              <CombatPanel
                userCardId={entry.userCard.id}
                card={card}
                variant={variant}
                quantity={quantity}
                level={entry.userCard.level}
                palier={entry.userCard.palier}
              />
            )}

            {/* Equipment slots */}
            {isOwned && entry.userCard && (
              <EquipmentSlotsPanel
                userCardId={entry.userCard.id}
                rarityHex={rarityHex}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
