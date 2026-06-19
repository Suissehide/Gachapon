import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { CardViewModal } from '../../components/collection/CardViewModal.tsx'
import { CollectionFilters } from '../../components/collection/CollectionFilters.tsx'
import { CollectionGrid } from '../../components/collection/CollectionGrid.tsx'
import { CollectionSetGroup } from '../../components/collection/CollectionSetGroup.tsx'
import { RecycleModal } from '../../components/collection/RecycleModal.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import {
  type UserCard,
  useCards,
  useUserCollection,
} from '../../queries/useCollection'
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

  const allCards = useMemo(() => catalogData?.cards ?? [], [catalogData?.cards])
  const userCards = useMemo(() => userColl?.cards ?? [], [userColl?.cards])

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
        entries.push({
          key: `${card.id}-NORMAL`,
          card,
          variant: 'NORMAL',
          quantity: 0,
          isOwned: false,
          userCard: null,
        })
      } else {
        for (const uc of owned) {
          entries.push({
            key: `${card.id}-${uc.variant}`,
            card: uc.card,
            variant: uc.variant,
            quantity: uc.quantity,
            isOwned: true,
            userCard: uc,
          })
        }
      }
    }
    return entries
  }, [allCards, userCards])

  const filteredEntries = useMemo(
    () =>
      displayEntries
        .filter(
          (e) =>
            selectedRarities.length === 0 ||
            selectedRarities.includes(e.card.rarity),
        )
        .filter(
          (e) =>
            selectedVariants.length === 0 ||
            selectedVariants.includes(e.variant),
        ),
    [displayEntries, selectedRarities, selectedVariants],
  )

  const collectionStats = useMemo(() => {
    const distinctCardIds = new Set(userCards.map((uc) => uc.card.id))
    const distinctCards = distinctCardIds.size
    const totalOwnedVariants = userCards.length

    const totalCards = allCards.length
    const variantEligible = allCards.filter((c) =>
      ['RARE', 'EPIC', 'LEGENDARY'].includes(c.rarity),
    ).length
    const totalPossibleVariants =
      totalCards - variantEligible + variantEligible * 3

    return {
      distinctCards,
      totalCards,
      totalOwnedVariants,
      totalPossibleVariants,
    }
  }, [allCards, userCards])

  const setGroups = useMemo(() => {
    if (displayMode !== 'set') {
      return []
    }
    const order: string[] = []
    const groups = new Map<string, { name: string; entries: DisplayEntry[] }>()
    for (const entry of filteredEntries) {
      const setId = entry.card.set.id
      if (!groups.has(setId)) {
        order.push(setId)
        groups.set(setId, { name: entry.card.set.name, entries: [] })
      }
      groups.get(setId)?.entries.push(entry)
    }
    return order.map((id) => {
      const group = groups.get(id)
      if (!group) {
        return { id, name: '', entries: [] as DisplayEntry[] }
      }
      return { id, ...group }
    })
  }, [displayMode, filteredEntries])

  const handleRecycle = (entry: DisplayEntry) => {
    if (entry.userCard) {
      setRecycleTarget(entry.userCard)
    }
  }

  const handleDetail = (entry: DisplayEntry) => setDetailTarget(entry)

  const handleRecycleFromDetail = () => {
    if (detailTarget?.userCard) {
      setRecycleTarget(detailTarget.userCard)
    }
  }

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode)
  }

  return (
    <PageShell>
      <PageHeader
          breadcrumbs={[
            { label: 'Gachapon', to: '/play' },
            {
              label: 'Profil',
              to: '/profile/$username',
              params: { username: user?.username ?? '' },
            },
            { label: 'Collection' },
          ]}
          title="Ma collection"
          subtitle={
            <>
              Cartes : {collectionStats.distinctCards}/
              {collectionStats.totalCards} · Variantes :{' '}
              {collectionStats.totalOwnedVariants}/
              {collectionStats.totalPossibleVariants}
            </>
          }
        />

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
          <CollectionGrid
            entries={filteredEntries}
            onRecycle={handleRecycle}
            onDetail={handleDetail}
          />
        )}
      <CardViewModal
        entry={detailTarget}
        onClose={() => setDetailTarget(null)}
        onRecycle={handleRecycleFromDetail}
      />
      {recycleTarget && (
        <RecycleModal
          open={!!recycleTarget}
          onOpenChange={(open) => {
            if (!open) {
              setRecycleTarget(null)
            }
          }}
          onRecycled={() => {
            setRecycleTarget(null)
            setDetailTarget(null)
          }}
          card={{ ...recycleTarget.card, quantity: recycleTarget.quantity }}
          variant={recycleTarget.variant}
        />
      )}
    </PageShell>
  )
}
