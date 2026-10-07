import { Recycle, Star, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import type { CardVariant } from '../../constants/card.constant'
import {
  type CardElement,
  ELEMENT_COLOR,
  ELEMENT_ICON,
  ELEMENT_LABELS,
} from '../../constants/card.constant.ts'
import { describePassive } from '../../constants/passives.constant.ts'
import i18n from '../../i18n/index.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useCardEquipmentBonuses } from '../../queries/useEquipment.ts'
import type { WishlistResponse } from '../../queries/useWishlist.ts'
import { useToggleWishlist, useWishlist } from '../../queries/useWishlist.ts'
import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import type { StatBonuses, StatCurve } from '../../utils/cardStats.ts'
import { displayStats } from '../../utils/cardStats.ts'
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
  COMMON: '#6b7280',
  UNCOMMON: '#22c55e',
  RARE: '#3b82f6',
  EPIC: '#8b5cf6',
  LEGENDARY: '#f59e0b',
}

// `common:cardVariant.*` : même libellé que sous la carte de l'écran de
// révélation. « Brillante » partout, accordé à « carte ».
const VARIANT_LABELS: Record<string, { label: string; className: string }> = {
  BRILLIANT: {
    label: i18n.t('common:cardVariant.brilliant'),
    className: 'bg-amber-400/25 border border-amber-500/50 text-amber-700',
  },
  HOLOGRAPHIC: {
    label: i18n.t('common:cardVariant.holographic'),
    className: 'bg-cyan-400/20 border border-cyan-500/40 text-cyan-700',
  },
}

/**
 * Bouton bascule : c'est la SEULE façon de retirer un vœu dans toute l'app.
 * Le désactiver quand la carte est souhaitée rendrait les emplacements
 * définitifs — plus aucun moyen de changer de carte une fois pleins.
 */
function WishlistButton({
  isWishlisted,
  loading,
  onToggle,
}: {
  isWishlisted: boolean
  loading: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('collection')
  return (
    <div className="mt-3 flex">
      <Button
        variant={isWishlisted ? 'secondary' : 'outline'}
        size="sm"
        disabled={loading}
        onClick={onToggle}
        className="h-auto gap-1.5 rounded-[11px] border-[rgba(27,23,38,0.14)] px-[15px] py-[9px] text-[13.5px] font-semibold"
      >
        <Star
          className="h-[15px] w-[15px]"
          fill={isWishlisted ? 'currentColor' : 'none'}
        />
        {isWishlisted
          ? t('collection:detail.removeWish')
          : t('collection:detail.setWish')}
      </Button>
    </div>
  )
}

/** Hors composant : `CardViewModal` frôle le seuil de complexité cognitive. */
function isWished(
  wishlist: WishlistResponse | undefined,
  cardId: string,
): boolean {
  return wishlist?.cards.some((c) => c.id === cardId) ?? false
}

/**
 * Stats de la face de carte, équipement compris. Hors composant comme
 * `isWished` : `CardViewModal` frôle le seuil de complexité cognitive.
 */
function faceStats(
  input: {
    card: DisplayEntry['card']
    level: number
    variant: CardVariant
    palier: number
    bonuses: StatBonuses
    curve: StatCurve
  } | null,
): CardStats | null {
  if (input === null) {
    return null
  }
  const { card, level, variant, palier, bonuses, curve } = input
  return displayStats(card, level, variant, palier, bonuses, curve)
}

export function CardViewModal({ entry, onClose, onRecycle }: Props) {
  // Hooks must be called unconditionally — before any early return.
  const { t } = useTranslation(['collection', 'common'])
  const { data: wishlist } = useWishlist()
  const { mutate: toggleWishlist, isPending: settingWishlist } =
    useToggleWishlist()
  const bonuses = useCardEquipmentBonuses(entry?.userCard?.id ?? '')
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  // Échap ferme, où que soit le focus. `defaultPrevented` : une modale Radix
  // ouverte par-dessus (elle écoute en capture et marque l'évènement) ferme
  // seule, sans emporter celle-ci.
  const open = entry !== null
  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!entry) {
    return null
  }

  const { card, variant, quantity, isOwned, userCard } = entry
  const isWishlisted = isWished(wishlist, card.id)
  const rarityHex = RARITY_HEX[card.rarity] ?? RARITY_HEX.COMMON
  const variantInfo = variant !== 'NORMAL' ? VARIANT_LABELS[variant] : null

  const panelStyle = { '--rar': rarityHex } as CSSProperties

  const stats = faceStats(
    isOwned && userCard
      ? {
          card,
          level: userCard.level,
          variant,
          palier: userCard.palier,
          bonuses,
          curve: economy.card,
        }
      : null,
  )

  const description =
    isOwned && userCard
      ? describePassive(card.passiveKey, userCard.palier)
      : null

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-[100] overflow-y-auto bg-black/55 backdrop-blur-md">
      <div className="relative flex min-h-full items-center justify-center px-4 py-10">
        {/* Backdrop as a button: clicking beside the card closes. Out of the
         * tab order and hidden from screen readers — Escape and the X button
         * already cover the keyboard. */}
        <Button
          variant="transparent"
          size="bare"
          tabIndex={-1}
          aria-hidden
          onClick={onClose}
          className="absolute inset-0 cursor-default rounded-none"
        />
        {/* Click-through layout: only the card and the panel take the pointer,
         * the gaps between them fall through to the backdrop. */}
        <div className="pointer-events-none relative flex flex-wrap items-center justify-center gap-8 animate-in fade-in-0 zoom-in-95 duration-300 md:gap-10">
          <div className="pointer-events-auto">
            <CardDisplay
              rarity={card.rarity}
              name={card.name}
              setName={card.set.name}
              imageUrl={card.imageUrl}
              variant={variant}
              isOwned={isOwned}
              interactive
              large
              showAura
              level={userCard?.level ?? null}
              stats={stats}
              element={card.element}
              description={description}
            />
          </div>

          <Card
            className="pointer-events-auto flex max-h-[calc(100dvh-var(--topbar-h)-5rem)] w-full max-w-[400px] flex-col overflow-y-auto overscroll-contain rounded-[22px] border-[rgba(27,23,38,0.06)] p-6 shadow-[0_2px_0_rgba(27,23,38,0.03),0_30px_60px_-28px_rgba(27,23,38,0.4)] md:w-[400px]"
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
                  {card.element && <ElementChip element={card.element} />}
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
                aria-label={t('common:a11y.close')}
                className="shrink-0 rounded-[10px] bg-[rgba(27,23,38,0.06)] text-[rgba(27,23,38,0.55)] hover:bg-[rgba(27,23,38,0.12)] hover:text-text"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Wishlist */}
            <WishlistButton
              isWishlisted={isWishlisted}
              loading={settingWishlist}
              onToggle={() =>
                toggleWishlist({ cardId: card.id, wished: isWishlisted })
              }
            />

            {/* Meta — Owned + inline recycle */}
            {isOwned && (
              <div className="mt-[14px] flex items-center justify-between border-y border-[rgba(27,23,38,0.08)] py-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] text-text-light">
                    {t('collection:detail.ownedLabel')}
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
                    {t('collection:detail.recycle')}
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

// Element chip — sits next to the rarity chip in the recap header and borrows
// its shape, so the two read as one row of tags; only the accent colour and the
// leading pictogram change.
function ElementChip({ element }: { element: CardElement }) {
  const hex = ELEMENT_COLOR[element]
  const Icon = ELEMENT_ICON[element]
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.75 py-1.25 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
      style={{
        color: hex,
        backgroundColor: `color-mix(in oklab, ${hex} 14%, white)`,
        borderColor: `color-mix(in oklab, ${hex} 45%, transparent)`,
      }}
    >
      <Icon className="h-3 w-3" />
      {ELEMENT_LABELS[element]}
    </span>
  )
}
