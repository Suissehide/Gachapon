import type { DisplayEntry } from '../../routes/_authenticated/collection.tsx'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionSetGroupProps {
  setName: string
  entries: DisplayEntry[]
  onRecycle: (entry: DisplayEntry) => void
  onDetail: (entry: DisplayEntry) => void
}

export function CollectionSetGroup({ setName, entries, onRecycle, onDetail }: CollectionSetGroupProps) {
  const distinctCardIds = new Set(entries.filter((e) => e.isOwned).map((e) => e.card.id))
  const distinctCards = distinctCardIds.size
  const totalCards = new Set(entries.map((e) => e.card.id)).size
  const ownedVariants = entries.filter((e) => e.isOwned).length
  const totalVariants = entries.length
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-light">
          {setName} · Cartes : {distinctCards}/{totalCards} · Variantes : {ownedVariants}/{totalVariants}
        </span>
        <span className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
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
