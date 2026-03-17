import type { Card } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionGridProps {
  cards: Card[]
  owned: Map<string, number>
  onRecycle: (cardId: string) => void
  recyclingId: string | null
}

export function CollectionGrid({
  cards,
  owned,
  onRecycle,
  recyclingId,
}: CollectionGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-text-light">Aucune carte ne correspond à ces filtres.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((card) => {
        const qty = owned.get(card.id) ?? 0
        return (
          <CollectionCard
            key={card.id}
            card={card}
            quantity={qty}
            isOwned={qty > 0}
            onRecycle={() => onRecycle(card.id)}
            recycling={recyclingId === card.id}
          />
        )
      })}
    </div>
  )
}
