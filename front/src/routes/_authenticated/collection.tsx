import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import type { Card, CardVariant } from '../../api/collection.api.ts'
import { CardViewModal } from '../../components/collection/CardViewModal.tsx'
import {
  CollectionFilters,
  type GroupMode,
  type OwnershipFilter,
  type RarityFilter,
  type VariantFilter,
} from '../../components/collection/CollectionFilters.tsx'
import { CollectionSection } from '../../components/collection/CollectionSection.tsx'
import { RecycleModal } from '../../components/collection/RecycleModal.tsx'
import { ArcadeCard } from '../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import {
  type UserCard,
  useCards,
  useUserCollection,
} from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'
import { RARITY_LABELS, RARITY_ORDER } from '../../components/collection/CollectionCard.tsx'

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

function Collection() {
  const user = useAuthStore((s) => s.user)
  const [group, setGroup] = useState<GroupMode>('rarity')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [variant, setVariant] = useState<VariantFilter>('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('owned')
  const [recycleTarget, setRecycleTarget] = useState<UserCard | null>(null)
  // Store just the key so we always re-derive the *fresh* entry from
  // displayEntries. Storing the entry itself would freeze level/palier/quantity
  // at the moment of click — subsequent level-ups / ascensions wouldn't be
  // reflected until the modal is reopened.
  const [detailKey, setDetailKey] = useState<string | null>(null)

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

  const filteredEntries = useMemo(() => {
    return displayEntries
      .filter((e) => rarity === 'all' || e.card.rarity === rarity)
      .filter((e) => variant === 'all' || e.variant === variant)
      .filter((e) => ownership === 'all' || e.isOwned)
  }, [displayEntries, rarity, variant, ownership])

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

  const sections = useMemo(() => {
    if (group === 'rarity') {
      // Most rare → least rare (LEGENDARY first, COMMON last).
      return [...RARITY_ORDER]
        .reverse()
        .map((r) => ({
          key: r,
          title: RARITY_LABELS[r],
          entries: filteredEntries.filter((e) => e.card.rarity === r),
        }))
        .filter((g) => g.entries.length > 0)
    }
    // group === 'set'
    const order: string[] = []
    const byId = new Map<string, { name: string; entries: DisplayEntry[] }>()
    for (const entry of filteredEntries) {
      const setId = entry.card.set.id
      if (!byId.has(setId)) {
        order.push(setId)
        byId.set(setId, { name: entry.card.set.name, entries: [] })
      }
      byId.get(setId)?.entries.push(entry)
    }
    return order.map((id) => {
      const group = byId.get(id)
      return {
        key: id,
        title: group?.name ?? '',
        entries: group?.entries ?? [],
      }
    })
  }, [group, filteredEntries])

  const handleDetail = (entry: DisplayEntry) => setDetailKey(entry.key)

  const detailTarget = useMemo(
    () =>
      detailKey ? displayEntries.find((e) => e.key === detailKey) ?? null : null,
    [detailKey, displayEntries],
  )

  const handleRecycleFromDetail = () => {
    if (detailTarget?.userCard) {
      setRecycleTarget(detailTarget.userCard)
    }
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
          <span className="font-mono">
            Cartes :{' '}
            <b className="font-bold text-text">
              {collectionStats.distinctCards}/{collectionStats.totalCards}
            </b>{' '}
            · Variantes :{' '}
            <b className="font-bold text-text">
              {collectionStats.totalOwnedVariants}/
              {collectionStats.totalPossibleVariants}
            </b>
          </span>
        }
      />

      <ArcadeCard>
        <CollectionFilters
          group={group}
          onGroupChange={setGroup}
          rarity={rarity}
          onRarityChange={setRarity}
          variant={variant}
          onVariantChange={setVariant}
          ownership={ownership}
          onOwnershipChange={setOwnership}
        />
      </ArcadeCard>

      {sections.length === 0 ? (
        <ArcadeCard>
          <p className="py-14 text-center font-mono text-sm tracking-[0.04em] text-text-light/60">
            Aucune carte ne correspond à ces filtres.
          </p>
        </ArcadeCard>
      ) : (
        sections.map((section) => (
          <CollectionSection
            key={section.key}
            title={section.title}
            entries={section.entries}
            onDetail={handleDetail}
          />
        ))
      )}

      <CardViewModal
        entry={detailTarget}
        onClose={() => setDetailKey(null)}
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
            setDetailKey(null)
          }}
          card={{ ...recycleTarget.card, quantity: recycleTarget.quantity }}
          variant={recycleTarget.variant}
        />
      )}
    </PageShell>
  )
}
