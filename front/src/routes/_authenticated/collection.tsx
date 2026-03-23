import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card } from '../../api/collection.api.ts'
import { RARITY_LABELS } from '../../components/collection/CollectionCard.tsx'
import { CollectionFilters } from '../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../components/collection/CollectionSetGroup.tsx'
import { RecycleModal } from '../../components/collection/RecycleModal.tsx'
import { useUserCollection, type UserCard } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

type DisplayMode = 'rarity' | 'set'
type Rarity = Card['rarity']
type Variant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rarity')
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [recycleTarget, setRecycleTarget] = useState<UserCard | null>(null)

  const { data: userColl } = useUserCollection(user?.id)

  const userCards = userColl?.cards ?? []

  const filteredUserCards = useMemo(
    () =>
      userCards
        .filter((uc) => !selectedRarity || uc.card.rarity === selectedRarity)
        .filter((uc) => !selectedVariant || uc.variant === selectedVariant),
    [userCards, selectedRarity, selectedVariant],
  )

  const subtitle = useMemo(() => {
    if (displayMode === 'set') {
      const setCount = new Set(userCards.map((uc) => uc.card.set.id)).size
      return `${userCards.length} variante${userCards.length > 1 ? 's' : ''} · ${setCount} set${setCount > 1 ? 's' : ''}`
    }
    const base = `${filteredUserCards.length} variante${filteredUserCards.length > 1 ? 's' : ''}`
    const rarityLabel = selectedRarity
      ? ` · ${RARITY_LABELS[selectedRarity]}`
      : ''
    const variantLabel = selectedVariant
      ? ` · ${selectedVariant === 'BRILLIANT' ? '✨ Brillante' : selectedVariant === 'HOLOGRAPHIC' ? '🌈 Holographique' : 'Normal'}`
      : ''
    return base + rarityLabel + variantLabel
  }, [
    displayMode,
    userCards,
    filteredUserCards,
    selectedRarity,
    selectedVariant,
  ])

  const setGroups = useMemo(() => {
    if (displayMode !== 'set') {
      return []
    }
    const order: string[] = []
    const groups = new Map<string, { name: string; userCards: UserCard[] }>()
    for (const uc of userCards) {
      const setId = uc.card.set.id
      if (!groups.has(setId)) {
        order.push(setId)
        groups.set(setId, { name: uc.card.set.name, userCards: [] })
      }
      groups.get(setId)?.userCards.push(uc)
    }
    return order.map((id) => ({ id, ...groups.get(id)! }))
  }, [displayMode, userCards])

  const handleRecycle = (userCard: UserCard) => {
    setRecycleTarget(userCard)
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

        {displayMode === 'set' ? (
          setGroups.map((group) => (
            <CollectionSetGroup
              key={group.id}
              setName={group.name}
              userCards={group.userCards}
              onRecycle={handleRecycle}
            />
          ))
        ) : (
          <CollectionGrid
            userCards={filteredUserCards}
            onRecycle={handleRecycle}
          />
        )}
      </div>
      {recycleTarget && (
        <RecycleModal
          open={!!recycleTarget}
          onOpenChange={(open) => { if (!open) setRecycleTarget(null) }}
          card={{ ...recycleTarget.card, quantity: recycleTarget.quantity }}
          variant={recycleTarget.variant}
        />
      )}
    </div>
  )
}
