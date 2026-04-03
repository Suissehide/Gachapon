import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionSetGroupProps {
  setName: string
  entries: DisplayEntry[]
  onRecycle: (entry: DisplayEntry) => void
  onDetail: (entry: DisplayEntry) => void
}

export function CollectionSetGroup({ setName, entries, onRecycle, onDetail }: CollectionSetGroupProps) {
  const ownedCount = entries.filter((e) => e.isOwned).length
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-light">
          {setName} · {ownedCount} / {entries.length}
        </span>
        <span className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {entries.map((entry) => (
          <CollectionCard
            key={entry.key}
            card={entry.card}
            variant={entry.variant}
            quantity={entry.quantity}
            isOwned={entry.isOwned}
            onRecycle={() => onRecycle(entry)}
            onClick={() => onDetail(entry)}
          />
        ))}
      </div>
    </div>
  )
}
