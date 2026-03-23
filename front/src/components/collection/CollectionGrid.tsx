import type { UserCard } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionGridProps {
  userCards: UserCard[]
  onRecycle: (userCard: UserCard) => void
}

export function CollectionGrid({ userCards, onRecycle }: CollectionGridProps) {
  if (userCards.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-text-light">
          Aucune carte ne correspond à ces filtres.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {userCards.map((uc) => (
        <CollectionCard
          key={`${uc.card.id}-${uc.variant}`}
          card={uc.card}
          variant={uc.variant}
          quantity={uc.quantity}
          isOwned={true}
          onRecycle={() => onRecycle(uc)}
        />
      ))}
    </div>
  )
}
