import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Card } from '../../queries/useCollection'
import {
  useCards,
  useRecycle,
  useUserCollection,
} from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

const RARITY_ORDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const
const RARITY_COLORS: Record<string, string> = {
  COMMON: 'border-border text-text-light',
  UNCOMMON: 'border-green-500/40 text-green-400',
  RARE: 'border-accent/40 text-accent',
  EPIC: 'border-secondary/40 text-secondary',
  LEGENDARY: 'border-primary/50 text-primary',
}
const RARITY_LABELS: Record<string, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

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
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text">Ma Collection</h1>
            <p className="text-sm text-text-light">
              {ownedCount} / {cards.length} cartes
            </p>
          </div>

          {/* Filtres rareté */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedRarity(null)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                selectedRarity === null
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-text-light hover:border-primary/40'
              }`}
            >
              Tout
            </button>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() =>
                  setSelectedRarity(selectedRarity === r ? null : r)
                }
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedRarity === r
                    ? `${RARITY_COLORS[r]} bg-current/10`
                    : 'border-border text-text-light hover:border-primary/40'
                }`}
              >
                {RARITY_LABELS[r]}
              </button>
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
              const isOwned = qty > 0
              return (
                <CardItem
                  key={card.id}
                  card={card}
                  quantity={qty}
                  isOwned={isOwned}
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

function CardItem({
  card,
  quantity,
  isOwned,
  onRecycle,
  recycling,
}: {
  card: Card
  quantity: number
  isOwned: boolean
  onRecycle: () => void
  recycling: boolean
}) {
  return (
    <div className="group relative">
      <div
        className={`relative aspect-[3/4] rounded-xl overflow-hidden border transition-transform duration-200 group-hover:-translate-y-0.5 ${
          isOwned
            ? (RARITY_COLORS[card.rarity]?.split(' ')[0] ?? 'border-border')
            : 'border-border'
        }`}
      >
        {/* Image ou silhouette */}
        {isOwned ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="h-full w-full bg-muted/40 flex items-center justify-center">
            <div
              className="h-3/4 w-full opacity-20"
              style={{
                backgroundImage: `url(${card.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0)',
              }}
            />
          </div>
        )}

        {/* Badge quantité */}
        {quantity > 1 && (
          <div className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ×{quantity}
          </div>
        )}

        {/* Badge variant */}
        {card.variant && isOwned && (
          <div className="absolute top-1 left-1 text-xs">
            {card.variant === 'BRILLIANT' ? '✨' : '🌈'}
          </div>
        )}
      </div>

      {/* Nom (visible au survol) */}
      <div className="mt-1 px-0.5">
        <p className="truncate text-[10px] font-semibold text-text-light">
          {isOwned ? card.name : '???'}
        </p>
      </div>

      {/* Bouton recycler (apparaît au survol si doublon) */}
      {quantity > 1 && (
        <button
          type="button"
          onClick={onRecycle}
          disabled={recycling}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-yellow-400 hover:bg-black transition-colors"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Recycler
        </button>
      )}
    </div>
  )
}
