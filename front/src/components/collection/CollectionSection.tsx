import { useTranslation } from 'react-i18next'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import type { UserCard } from '../../queries/useCollection.ts'
import { useWishlist } from '../../queries/useWishlist.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { CollectionCard } from './CollectionCard.tsx'
import {
  type DisplayEntry,
  finishesPerCard,
  hasFinishes,
  ownedFinishCount,
} from './collectionEntries.ts'
import { FinishRow } from './FinishRow.tsx'

export type SectionStats = {
  distinctCards: number
  totalCards: number
  ownedVariants: number
  totalVariants: number
}

// Completeness for a section, computed from the FULL catalog slice (all cards
// that exist in the rarity/set) so the denominator is the max obtainable —
// independent of the ownership/variant view filters applied to the grid.
export function computeSectionStats(
  sectionCards: Card[],
  userCards: UserCard[],
): SectionStats {
  const cardIds = new Set(sectionCards.map((c) => c.id))
  const owned = userCards.filter((uc) => cardIds.has(uc.card.id))
  return {
    distinctCards: owned.length,
    totalCards: cardIds.size,
    ownedVariants: owned.reduce((sum, uc) => sum + ownedFinishCount(uc), 0),
    totalVariants: sectionCards.reduce(
      (sum, c) => sum + finishesPerCard(c.rarity),
      0,
    ),
  }
}

type Props = {
  title: string
  entries: DisplayEntry[]
  stats: SectionStats
  onDetail: (entryKey: string) => void
  /** Absent : vernis en lecture seule (collection d'un autre joueur). */
  onPickFinish?: (userCard: UserCard, finish: CardVariant) => void
  showWishlist?: boolean
  // Identifiants de cartes verrouillées par un duel en cours (`engagedCardIds`
  // de `useWagers`).
  engagedCardIds?: Set<string>
}

/** Une tuile : la carte, et sous elle ses vernis si elle en a. */
function EntryTile({
  entry,
  isWishlisted,
  isEngaged,
  onDetail,
  onPickFinish,
}: {
  entry: DisplayEntry
  isWishlisted: boolean
  isEngaged: boolean
  onDetail: (entryKey: string) => void
  onPickFinish?: Props['onPickFinish']
}) {
  const uc = entry.userCard
  // -m-4 p-4 : content-visibility coupe le rendu à la boîte, les pastilles et
  // le survol débordent. pointer-events-none : la marge chevauche les voisines.
  return (
    <div className="pointer-events-none -m-4 p-4 [content-visibility:auto] [contain-intrinsic-block-size:auto_290px] [&>*]:pointer-events-auto">
      <CollectionCard
        card={entry.card}
        variant={entry.variant}
        finishes={entry.finishes}
        quantity={entry.quantity}
        isOwned={entry.isOwned}
        userCardId={uc?.id ?? null}
        level={uc?.level ?? null}
        palier={uc?.palier ?? null}
        isWishlisted={isWishlisted}
        isEngaged={isEngaged}
        entryKey={entry.key}
        onClick={onDetail}
      />
      {uc && hasFinishes(entry.card.rarity) && (
        <FinishRow
          finishes={uc.finishes}
          shown={uc.displayedFinish}
          onPick={onPickFinish && ((finish) => onPickFinish(uc, finish))}
        />
      )}
    </div>
  )
}

// Isolated subcomponent so useWishlist() is only called when the viewer is
// looking at their OWN collection. Mounting it conditionally satisfies
// Rules of Hooks — no conditional hook calls in the parent.
function WishlistAwareCards({
  entries,
  onDetail,
  onPickFinish,
  engagedCardIds,
}: {
  entries: DisplayEntry[]
  onDetail: (entryKey: string) => void
  onPickFinish?: Props['onPickFinish']
  engagedCardIds?: Set<string>
}) {
  const { data: wishlist } = useWishlist()
  return (
    <>
      {entries.map((entry) => (
        <EntryTile
          key={entry.key}
          entry={entry}
          isWishlisted={
            wishlist?.cards.some((c) => c.id === entry.card.id) ?? false
          }
          isEngaged={engagedCardIds?.has(entry.card.id) ?? false}
          onDetail={onDetail}
          onPickFinish={onPickFinish}
        />
      ))}
    </>
  )
}

export function CollectionSection({
  title,
  entries,
  stats,
  onDetail,
  onPickFinish,
  showWishlist = false,
  engagedCardIds,
}: Props) {
  const { t } = useTranslation('collection')
  const { distinctCards, totalCards, ownedVariants, totalVariants } = stats

  return (
    <ArcadeCard>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-text/70">
          {title}
        </h2>
        <span className="font-mono text-[11px] tracking-[0.08em] text-text-light/60 whitespace-nowrap">
          {t('collection:section.counts', {
            distinctCards,
            totalCards,
            ownedVariants,
            totalVariants,
          })}
        </span>
        <span className="h-px flex-1 bg-[rgba(27,23,38,0.12)]" />
      </div>

      <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {showWishlist ? (
          <WishlistAwareCards
            entries={entries}
            onDetail={onDetail}
            onPickFinish={onPickFinish}
            engagedCardIds={engagedCardIds}
          />
        ) : (
          entries.map((entry) => (
            <EntryTile
              key={entry.key}
              entry={entry}
              isWishlisted={false}
              isEngaged={engagedCardIds?.has(entry.card.id) ?? false}
              onDetail={onDetail}
              onPickFinish={onPickFinish}
            />
          ))
        )}
      </div>
    </ArcadeCard>
  )
}
