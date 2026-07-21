import type { Card } from '../../api/collection.api.ts'
import type { UserCard } from '../../queries/useCollection.ts'
import { useWishlist } from '../../queries/useWishlist.ts'
import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { CollectionCard } from './CollectionCard.tsx'

// Rarities that ship in 3 variants (NORMAL + 2 special) — everything else has 1.
const VARIANT_RARITIES = ['RARE', 'EPIC', 'LEGENDARY']
const variantsPerCard = (rarity: string) =>
  VARIANT_RARITIES.includes(rarity) ? 3 : 1

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
    distinctCards: new Set(owned.map((uc) => uc.card.id)).size,
    totalCards: cardIds.size,
    ownedVariants: owned.length,
    totalVariants: sectionCards.reduce(
      (sum, c) => sum + variantsPerCard(c.rarity),
      0,
    ),
  }
}

type Props = {
  title: string
  entries: DisplayEntry[]
  stats: SectionStats
  onDetail: (entry: DisplayEntry) => void
  showWishlist?: boolean
}

// Isolated subcomponent so useWishlist() is only called when the viewer is
// looking at their OWN collection. Mounting it conditionally satisfies
// Rules of Hooks — no conditional hook calls in the parent.
function WishlistAwareCards({
  entries,
  onDetail,
}: {
  entries: DisplayEntry[]
  onDetail: (entry: DisplayEntry) => void
}) {
  const { data: wishlist } = useWishlist()
  return (
    <>
      {entries.map((entry) => (
        <CollectionCard
          key={entry.key}
          card={entry.card}
          variant={entry.variant}
          quantity={entry.quantity}
          isOwned={entry.isOwned}
          userCardId={entry.userCard?.id ?? null}
          level={entry.userCard?.level ?? null}
          palier={entry.userCard?.palier ?? null}
          isWishlisted={
            wishlist?.card?.id === entry.card.id && entry.variant === 'NORMAL'
          }
          onClick={() => onDetail(entry)}
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
  showWishlist = false,
}: Props) {
  const { distinctCards, totalCards, ownedVariants, totalVariants } = stats

  return (
    <ArcadeCard>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-text/70">
          {title}
        </h2>
        <span className="font-mono text-[11px] tracking-[0.08em] text-text-light/60 whitespace-nowrap">
          CARTES {distinctCards}/{totalCards} · VARIANTES {ownedVariants}/
          {totalVariants}
        </span>
        <span className="h-px flex-1 bg-[rgba(27,23,38,0.12)]" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {showWishlist ? (
          <WishlistAwareCards entries={entries} onDetail={onDetail} />
        ) : (
          entries.map((entry) => (
            <CollectionCard
              key={entry.key}
              card={entry.card}
              variant={entry.variant}
              quantity={entry.quantity}
              isOwned={entry.isOwned}
              userCardId={entry.userCard?.id ?? null}
              level={entry.userCard?.level ?? null}
              palier={entry.userCard?.palier ?? null}
              isWishlisted={false}
              onClick={() => onDetail(entry)}
            />
          ))
        )}
      </div>
    </ArcadeCard>
  )
}
