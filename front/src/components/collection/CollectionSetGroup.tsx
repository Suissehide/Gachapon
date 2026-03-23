import type { UserCard } from '../../api/collection.api.ts'
import { CollectionCard } from './CollectionCard.tsx'

interface CollectionSetGroupProps {
  setName: string
  userCards: UserCard[]
  onRecycle: (userCard: UserCard) => void
}

export function CollectionSetGroup({ setName, userCards, onRecycle }: CollectionSetGroupProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-light">
          {setName} · {userCards.length} variante{userCards.length > 1 ? 's' : ''}
        </span>
        <span className="h-px flex-1 bg-border/40" />
      </div>
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
    </div>
  )
}
