import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import {
  CollectionCard,
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_ORDER,
} from '../../components/custom/collectionCard.tsx'
import { Button } from '../../components/ui/button.tsx'
import { useCards, useRecycle, useUserCollection } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [recyclingId, setRecyclingId] = useState<string | null>(null)

  const { data: allCards, isLoading: cardsLoading } = useCards(
    selectedRarity ? { rarity: selectedRarity } : undefined,
  )
  const { data: userColl } = useUserCollection(user?.id)
  const { mutate: recycle } = useRecycle()

  const owned = useMemo(() => {
    const map = new Map<string, number>()
    for (const uc of userColl?.cards ?? []) {
      map.set(uc.card.id, uc.quantity)
    }
    return map
  }, [userColl])

  const cards = allCards?.cards ?? []
  const ownedCount = useMemo(
    () => cards.filter((c) => owned.has(c.id)).length,
    [cards, owned],
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Ma Collection</h1>
            <p className="text-sm text-text-light">
              {ownedCount} / {cards.length} cartes
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedRarity(null)}
              className={`rounded-full border h-auto px-3 py-1 text-xs font-semibold ${
                selectedRarity === null
                  ? 'border-primary bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary'
                  : 'border-border text-text-light hover:border-primary/40'
              }`}
            >
              Tout
            </Button>
            {RARITY_ORDER.map((r) => (
              <Button
                key={r}
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
                className={`rounded-full border h-auto px-3 py-1 text-xs font-semibold ${
                  selectedRarity === r
                    ? `${RARITY_COLORS[r]} bg-current/10 hover:bg-current/10`
                    : 'border-border text-text-light hover:border-primary/40'
                }`}
              >
                {RARITY_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>

        {cardsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-text-light">Chargement…</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {cards.map((card) => {
              const qty = owned.get(card.id) ?? 0
              return (
                <CollectionCard
                  key={card.id}
                  card={card}
                  quantity={qty}
                  isOwned={qty > 0}
                  onRecycle={() => {
                    setRecyclingId(card.id)
                    recycle(card.id, { onSettled: () => setRecyclingId(null) })
                  }}
                  recycling={recyclingId === card.id}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
