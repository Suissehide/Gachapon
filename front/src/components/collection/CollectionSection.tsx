import { useWishlist } from '../../queries/useWishlist.ts'
import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { CollectionCard } from './CollectionCard.tsx'

type Props = {
  title: string
  entries: DisplayEntry[]
  onDetail: (entry: DisplayEntry) => void
}

export function CollectionSection({ title, entries, onDetail }: Props) {
  const { data: wishlist } = useWishlist()

  const distinctCardIds = new Set(
    entries.filter((e) => e.isOwned).map((e) => e.card.id),
  )
  const distinctCards = distinctCardIds.size
  const totalCards = new Set(entries.map((e) => e.card.id)).size
  const ownedVariants = entries.filter((e) => e.isOwned).length
  const totalVariants = entries.length

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
        {entries.map((entry) => (
          <CollectionCard
            key={entry.key}
            card={entry.card}
            variant={entry.variant}
            quantity={entry.quantity}
            isOwned={entry.isOwned}
            level={entry.userCard?.level ?? null}
            palier={entry.userCard?.palier ?? null}
            isWishlisted={
              wishlist?.card?.id === entry.card.id && entry.variant === 'NORMAL'
            }
            onClick={() => onDetail(entry)}
          />
        ))}
      </div>
    </ArcadeCard>
  )
}
