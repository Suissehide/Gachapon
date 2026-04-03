import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Card, CardVariant } from '../../../api/collection.api.ts'
import { CollectionFilters } from '../../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../../components/collection/CollectionSetGroup.tsx'
import { useCards, useUserCollection, type UserCard } from '../../../queries/useCollection.ts'
import { useUserProfile } from '../../../queries/useProfile.ts'
import type { DisplayEntry } from '../collection.tsx'

export const Route = createFileRoute('/_authenticated/profile/$username_/collection')({
  component: UserCollectionPage,
})

type DisplayMode = 'rarity' | 'set'
type Rarity = Card['rarity']
type Variant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

function UserCollectionPage() {
  const { username } = Route.useParams()
  const { data: profile, isLoading: profileLoading } = useUserProfile(username)

  const [displayMode, setDisplayMode] = useState<DisplayMode>('rarity')
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([])
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([])

  const { data: catalogData } = useCards()
  const { data: userColl } = useUserCollection(profile?.id)

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
          entries.push({ key: `${card.id}-${uc.variant}`, card: uc.card, variant: uc.variant as CardVariant, quantity: uc.quantity, isOwned: true, userCard: uc })
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

  const ownedCount = userCards.length
  const totalCount = displayEntries.length
  const subtitle = `${ownedCount} / ${totalCount} carte${totalCount > 1 ? 's' : ''}`

  if (profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-text-light">Joueur introuvable.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <Link
            to="/profile/$username"
            params={{ username }}
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-light hover:text-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            @{username}
          </Link>
          <h1 className="text-2xl font-black text-text">Collection de @{username}</h1>
          <p className="text-sm text-text-light">{subtitle}</p>
        </div>

        <CollectionFilters
          displayMode={displayMode}
          onDisplayModeChange={(mode) => {
            setSelectedRarities([])
            setSelectedVariants([])
            setDisplayMode(mode)
          }}
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
              onRecycle={() => {}}
              onDetail={() => {}}
            />
          ))
        ) : (
          <CollectionGrid entries={filteredEntries} onRecycle={() => {}} onDetail={() => {}} />
        )}
      </div>
    </div>
  )
}
