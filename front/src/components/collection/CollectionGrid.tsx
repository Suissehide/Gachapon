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
    <div className="isolate flex flex-wrap gap-3 *:w-[calc((100%-4*0.75rem)/5)] md:*:w-[calc((100%-5*0.75rem)/6)] lg:*:w-[calc((100%-6*0.75rem)/7)]">
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
