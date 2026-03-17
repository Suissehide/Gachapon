import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card } from '../../api/collection.api.ts'
import { RARITY_LABELS } from '../../components/collection/CollectionCard.tsx'
import { CollectionFilters } from '../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../components/collection/CollectionSetGroup.tsx'
import { useCards, useRecycle, useUserCollection } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

type DisplayMode = 'rarity' | 'set'
type Rarity = Card['rarity']
type Variant = 'BRILLIANT' | 'HOLOGRAPHIC'

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rarity')
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [recyclingId, setRecyclingId] = useState<string | null>(null)

  const { data: allCards, isLoading: cardsLoading } = useCards()
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

  const filteredCards = useMemo(
    () =>
      (allCards?.cards ?? [])
        .filter((c) => !selectedRarity || c.rarity === selectedRarity)
        .filter((c) => !selectedVariant || c.variant === selectedVariant),
    [allCards, selectedRarity, selectedVariant],
  )

  const subtitle = useMemo(() => {
    if (displayMode === 'set') {
      const setCount = new Set(cards.map((c) => c.set.id)).size
      return `${cards.filter((c) => owned.has(c.id)).length} / ${cards.length} cartes · ${setCount} set${setCount > 1 ? 's' : ''}`
    }
    const base = `${filteredCards.filter((c) => owned.has(c.id)).length} / ${filteredCards.length} cartes`
    const rarityLabel = selectedRarity ? ` · ${RARITY_LABELS[selectedRarity]}` : ''
    const variantLabel = selectedVariant
      ? ` · ${selectedVariant === 'BRILLIANT' ? '✨ Brillante' : '🌈 Holographique'}`
      : ''
    return base + rarityLabel + variantLabel
  }, [displayMode, cards, filteredCards, owned, selectedRarity, selectedVariant])

  const setGroups = useMemo(() => {
    if (displayMode !== 'set') return []
    const order: string[] = []
    const groups = new Map<string, { name: string; cards: Card[] }>()
    for (const card of cards) {
      if (!groups.has(card.set.id)) {
        order.push(card.set.id)
        groups.set(card.set.id, { name: card.set.name, cards: [] })
      }
      groups.get(card.set.id)!.cards.push(card)
    }
    return order.map((id) => ({ id, ...groups.get(id)! }))
  }, [displayMode, cards])

  const handleRecycle = (cardId: string) => {
    setRecyclingId(cardId)
    recycle(cardId, { onSettled: () => setRecyclingId(null) })
  }

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setSelectedRarity(null)
    setSelectedVariant(null)
    setDisplayMode(mode)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-text">Ma Collection</h1>
            <p className="text-sm text-text-light">{subtitle}</p>
          </div>

          <CollectionFilters
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
            selectedRarity={selectedRarity}
            onRarityChange={setSelectedRarity}
            selectedVariant={selectedVariant}
            onVariantChange={setSelectedVariant}
          />
        </div>

        {cardsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-text-light">Chargement…</p>
          </div>
        ) : displayMode === 'set' ? (
          setGroups.map((group) => (
            <CollectionSetGroup
              key={group.id}
              setName={group.name}
              cards={group.cards}
              owned={owned}
              onRecycle={handleRecycle}
              recyclingId={recyclingId}
            />
          ))
        ) : (
          <CollectionGrid
            cards={filteredCards}
            owned={owned}
            onRecycle={handleRecycle}
            recyclingId={recyclingId}
          />
        )}
      </div>
    </div>
  )
}
