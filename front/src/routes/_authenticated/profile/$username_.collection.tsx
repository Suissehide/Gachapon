import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CardVariant } from '../../../api/collection.api.ts'
import {
  RARITY_LABELS,
  RARITY_ORDER,
} from '../../../components/collection/CollectionCard.tsx'
import {
  CollectionFilters,
  type GroupMode,
  type OwnershipFilter,
  type RarityFilter,
  type SortMode,
  type VariantFilter,
} from '../../../components/collection/CollectionFilters.tsx'
import {
  CollectionSection,
  computeSectionStats,
} from '../../../components/collection/CollectionSection.tsx'
import { ArcadeCard } from '../../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import {
  type UserCard,
  useCards,
  useUserCollection,
} from '../../../queries/useCollection.ts'
import { useUserProfile } from '../../../queries/useProfile.ts'
import { type DisplayEntry, sortEntries } from '../collection.tsx'

export const Route = createFileRoute(
  '/_authenticated/profile/$username_/collection',
)({
  component: UserCollectionPage,
})

function UserCollectionPage() {
  const { username } = Route.useParams()
  const { data: profile, isLoading: profileLoading } = useUserProfile(username)

  const [group, setGroup] = useState<GroupMode>('rarity')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [variant, setVariant] = useState<VariantFilter>('all')
  const [ownership, setOwnership] = useState<OwnershipFilter>('owned')
  const [sort, setSort] = useState<SortMode>('default')

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
            variant: uc.variant as CardVariant,
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
        .filter((e) => rarity === 'all' || e.card.rarity === rarity)
        .filter((e) => variant === 'all' || e.variant === variant)
        .filter((e) => ownership === 'all' || e.isOwned),
    [displayEntries, rarity, variant, ownership],
  )

  const sections = useMemo(() => {
    if (group === 'rarity') {
      return [...RARITY_ORDER]
        .reverse()
        .map((r) => ({
          key: r,
          title: RARITY_LABELS[r],
          entries: sortEntries(
            filteredEntries.filter((e) => e.card.rarity === r),
            sort,
          ),
          stats: computeSectionStats(
            allCards.filter((c) => c.rarity === r),
            userCards,
          ),
        }))
        .filter((g) => g.entries.length > 0)
    }
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
      const g = byId.get(id)
      return {
        key: id,
        title: g?.name ?? '',
        entries: sortEntries(g?.entries ?? [], sort),
        stats: computeSectionStats(
          allCards.filter((c) => c.set.id === id),
          userCards,
        ),
      }
    })
  }, [group, filteredEntries, allCards, userCards, sort])

  const ownedCount = userCards.length
  const totalCount = displayEntries.length

  if (profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] items-center justify-center">
        <p className="text-text-light">Joueur introuvable.</p>
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          {
            label: `@${username}`,
            to: '/profile/$username',
            params: { username },
          },
          { label: 'Collection' },
        ]}
        title={`Collection de @${username}`}
        subtitle={
          <span className="font-mono">
            {ownedCount} / {totalCount} carte{totalCount > 1 ? 's' : ''}
          </span>
        }
        right={
          <Link
            to="/profile/$username"
            params={{ username }}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-light/70 hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Profil
          </Link>
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
          sort={sort}
          onSortChange={setSort}
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
            stats={section.stats}
            onDetail={() => {
              // Vue lecture seule : pas de modale de détail sur le profil d'autrui.
            }}
          />
        ))
      )}
    </PageShell>
  )
}
