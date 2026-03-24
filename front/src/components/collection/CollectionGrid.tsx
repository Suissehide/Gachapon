import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionGridProps {
  entries: DisplayEntry[]
  onRecycle: (entry: DisplayEntry) => void
}

export function CollectionGrid({ entries, onRecycle }: CollectionGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-text-light">
          Aucune carte ne correspond à ces filtres.
        </p>
      </div>
    )
  }

  return (
    <div className="isolate grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {entries.map((entry) => (
        <CollectionCard
          key={entry.key}
          card={entry.card}
          variant={entry.variant}
          quantity={entry.quantity}
          isOwned={entry.isOwned}
          onRecycle={() => onRecycle(entry)}
        />
      ))}
    </div>
  )
}
