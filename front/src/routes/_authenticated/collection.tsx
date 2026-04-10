import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { RARITY_LABELS } from '../../components/collection/CollectionCard.tsx'
import { CardViewModal } from '../../components/collection/CardViewModal.tsx'
import { CollectionFilters } from '../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../components/collection/CollectionSetGroup.tsx'
import { RecycleModal } from '../../components/collection/RecycleModal.tsx'
import { useCards, useUserCollection, type UserCard } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export type DisplayEntry = {
  key: string
  card: Card
  variant: CardVariant
  quantity: number
  isOwned: boolean
  userCard: UserCard | null
}

export const Route = createFileRoute('/_authenticated/collection')({
  component: Collection,
})

type DisplayMode = 'rarity' | 'set'
type Rarity = Card['rarity']
type Variant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rarity')
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([])
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([])
  const [recycleTarget, setRecycleTarget] = useState<UserCard | null>(null)
  const [detailTarget, setDetailTarget] = useState<DisplayEntry | null>(null)

  const { data: catalogData } = useCards()
  const { data: userColl } = useUserCollection(user?.id)

  const allCards = catalogData?.cards ?? []
  const userCards = userColl?.cards ?? []

  const displayEntries = useMemo((): DisplayEntry[] => {
    const ownedByCardId = new Map<string, UserCard[]>()
    for (const uc of userCards) {
      const existing = ownedByCardId.get(uc.card.id) ?? []
      existing.push(uc)
      ownedByCardId.set(uc.card.id, existing)
    }

    const entries: DisplayEntry[] = []
    for (const card of allCards) {
      const owned = ownedByCardId.get(card.id) ?? []
      if (owned.length === 0) {
        entries.push({ key: `${card.id}-NORMAL`, card, variant: 'NORMAL', quantity: 0, isOwned: false, userCard: null })
      } else {
        for (const uc of owned) {
          entries.push({ key: `${card.id}-${uc.variant}`, card: uc.card, variant: uc.variant, quantity: uc.quantity, isOwned: true, userCard: uc })
        }
      }
    }
    return entries
  }, [allCards, userCards])

  const filteredEntries = useMemo(
    () =>
      displayEntries
        .filter((e) => selectedRarities.length === 0 || selectedRarities.includes(e.card.rarity))
        .filter((e) => selectedVariants.length === 0 || selectedVariants.includes(e.variant)),
    [displayEntries, selectedRarities, selectedVariants],
  )

  const subtitle = useMemo(() => {
    if (displayMode === 'set') {
      const ownedCount = userCards.length
      const totalCount = displayEntries.length
      return `${ownedCount} / ${totalCount} carte${totalCount > 1 ? 's' : ''}`
    }
    const ownedCount = filteredEntries.filter((e) => e.isOwned).length
    const totalCount = filteredEntries.length
    const base = `${ownedCount} / ${totalCount} carte${totalCount > 1 ? 's' : ''}`
    const rarityLabel = selectedRarities.length > 0
      ? ` · ${selectedRarities.map((r) => RARITY_LABELS[r]).join(', ')}`
      : ''
    const variantLabel = selectedVariants.length > 0
      ? ` · ${selectedVariants.map((v) => v === 'BRILLIANT' ? 'Brillante' : v === 'HOLOGRAPHIC' ? 'Holographique' : 'Normal').join(', ')}`
      : ''
    return base + rarityLabel + variantLabel
  }, [displayMode, userCards, filteredEntries, selectedRarities, selectedVariants, displayEntries.length])

  const setGroups = useMemo(() => {
    if (displayMode !== 'set') return []
    const order: string[] = []
    const groups = new Map<string, { name: string; entries: DisplayEntry[] }>()
    for (const entry of displayEntries) {
      const setId = entry.card.set.id
      if (!groups.has(setId)) {
        order.push(setId)
        groups.set(setId, { name: entry.card.set.name, entries: [] })
      }
      groups.get(setId)?.entries.push(entry)
    }
    return order.map((id) => ({ id, ...groups.get(id)! }))
  }, [displayMode, displayEntries])

  const handleRecycle = (entry: DisplayEntry) => {
    if (entry.userCard) setRecycleTarget(entry.userCard)
  }

  const handleDetail = (entry: DisplayEntry) => setDetailTarget(entry)

  const handleRecycleFromDetail = () => {
    if (detailTarget?.userCard) {
      setRecycleTarget(detailTarget.userCard)
    }
  }

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setSelectedRarities([])
    setSelectedVariants([])
    setDisplayMode(mode)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-text">Ma Collection</h1>
          <p className="text-sm text-text-light">{subtitle}</p>
        </div>

        <CollectionFilters
          displayMode={displayMode}
          onDisplayModeChange={handleDisplayModeChange}
          selectedRarities={selectedRarities}
          onRaritiesChange={setSelectedRarities}
          selectedVariants={selectedVariants}
          onVariantsChange={setSelectedVariants}
        />

        {displayMode === 'set' ? (
          setGroups.map((group) => (
            <CollectionSetGroup
              key={group.id}
              setName={group.name}
              entries={group.entries}
              onRecycle={handleRecycle}
              onDetail={handleDetail}
            />
          ))
        ) : (
          <CollectionGrid entries={filteredEntries} onRecycle={handleRecycle} onDetail={handleDetail} />
        )}
      </div>
      <CardViewModal
        entry={detailTarget}
        onClose={() => setDetailTarget(null)}
        onRecycle={handleRecycleFromDetail}
      />
      {recycleTarget && (
        <RecycleModal
          open={!!recycleTarget}
          onOpenChange={(open) => { if (!open) setRecycleTarget(null) }}
          onRecycled={() => { setRecycleTarget(null); setDetailTarget(null) }}
          card={{ ...recycleTarget.card, quantity: recycleTarget.quantity }}
          variant={recycleTarget.variant}
        />
      )}
    </div>
  )
}
