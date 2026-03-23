import type { Card } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionSetGroupProps {
  setName: string
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (card: Card, quantity: number) => void
}

export function CollectionSetGroup({ setName, cards, owned, onRecycle }: CollectionSetGroupProps) {
  const ownedCount = cards.filter((c) => owned.has(c.id)).length

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-light">
          {setName} · {ownedCount} / {cards.length}
        </span>
        <span className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {cards.map((card) => {
          const qty = owned.get(card.id) ?? 0
          return (
            <CollectionCard
              key={card.id}
              card={card}
              quantity={qty}
              isOwned={qty > 0}
              onRecycle={onRecycle}
            />
          )
        })}
      </div>
    </div>
  )
}
