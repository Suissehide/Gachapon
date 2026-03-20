import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { LayoutGrid, List, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  CardVariantPanel,
  CreateCardSheet,
  EditCardSheet,
  SetSidebar,
  useCardColumns,
  useCardColumnsAll,
} from '../../components/admin/cards'
import { ReactTable } from '../../components/table/reactTable'
import { Button } from '../../components/ui/button'
import DropdownFilter from '../../components/ui/dropdownFilter'
import { Input } from '../../components/ui/input'
import { SegmentedControl } from '../../components/ui/segmentedControl'
import { RARITY_OPTIONS } from '../../constants/card.constant'
import {
  type AdminCard,
  useAdminCards,
  useAdminCreateCard,
  useAdminDeleteCard,
  useAdminSets,
  useAdminUpdateCard,
  useAdminUpdateCardImage,
} from '../../queries/useAdminCards'

export const Route = createFileRoute('/_admin/admin/cards')({
  component: AdminCards,
})

function AdminCards() {
  const [view, setView] = useState<'sets' | 'all'>('sets')
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editCard, setEditCard] = useState<AdminCard | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRarities, setSelectedRarities] = useState<string[]>([])
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset filters when view changes
  useEffect(() => {
    setSearchQuery('')
    setSelectedRarities([])
    setSelectedSetIds([])
  }, [view])

  const { data: setsData } = useAdminSets()

  useEffect(() => {
    if (selectedSetId === null && setsData?.sets?.[0]) {
      setSelectedSetId(setsData.sets[0].id)
    }
  }, [setsData, selectedSetId])
  const { data: cardsData, isLoading } = useAdminCards(
    view === 'sets' ? { setId: selectedSetId ?? undefined } : {},
    { enabled: view === 'all' || !!selectedSetId },
  )

  const createCard = useAdminCreateCard()
  const updateCard = useAdminUpdateCard()
  const updateCardImage = useAdminUpdateCardImage()
  const deleteCard = useAdminDeleteCard()

  const sets = setsData?.sets ?? []
  const cards = cardsData?.cards ?? []

  const columns = useCardColumns(cards, setEditCard, (id) =>
    deleteCard.mutate(id),
  )
  const columnsAll = useCardColumnsAll(setEditCard, (id) =>
    deleteCard.mutate(id),
  )

  const filteredCards = cards.filter((card) => {
    if (
      searchQuery &&
      !card.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    if (
      selectedRarities.length > 0 &&
      !selectedRarities.includes(card.rarity)
    ) {
      return false
    }
    if (
      view === 'all' &&
      selectedSetIds.length > 0 &&
      !selectedSetIds.includes(card.set.id)
    ) {
      return false
    }
    return true
  })

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Cartes & Sets</h1>

        <div className="flex items-center gap-2">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              {
                value: 'sets',
                label: 'Sets',
                icon: <LayoutGrid className="h-3.5 w-3.5" />,
              },
              {
                value: 'all',
                label: 'Toutes',
                icon: <List className="h-3.5 w-3.5" />,
              },
            ]}
          />

          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle carte
          </Button>
        </div>
      </div>

      <CardVariantPanel />

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-light/50" />
          <Input
            placeholder="Rechercher une carte…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-52 pl-8 pr-7 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-text-light/50 hover:text-text transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <DropdownFilter
          label="Rareté"
          filters={RARITY_OPTIONS.map((r) => ({
            id: r.value,
            label: r.label,
            checked: selectedRarities.includes(r.value),
          }))}
          onFilterChange={(id, checked) =>
            setSelectedRarities((prev) =>
              checked ? [...prev, id] : prev.filter((r) => r !== id),
            )
          }
          onClear={() => setSelectedRarities([])}
        />
        {view === 'all' && (
          <DropdownFilter
            label="Set"
            filters={sets.map((s) => ({
              id: s.id,
              label: s.name,
              checked: selectedSetIds.includes(s.id),
            }))}
            onFilterChange={(id, checked) =>
              setSelectedSetIds((prev) =>
                checked ? [...prev, id] : prev.filter((sid) => sid !== id),
              )
            }
            onClear={() => setSelectedSetIds([])}
          />
        )}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-4 overflow-hidden">
        {view === 'sets' && (
          <SetSidebar
            selectedSetId={selectedSetId}
            onSelect={setSelectedSetId}
          />
        )}

        <CardTableArea
          view={view}
          selectedSetId={selectedSetId}
          isLoading={isLoading}
          columns={view === 'sets' ? columns : columnsAll}
          cards={filteredCards}
        />
      </div>

      <CreateCardSheet
        open={showCreate}
        onOpenChange={(o) => !o && setShowCreate(false)}
        onCreate={(fd) => createCard.mutate(fd)}
        sets={sets}
        defaultSetId={selectedSetId}
      />

      <EditCardSheet
        item={editCard}
        onOpenChange={(o) => !o && setEditCard(null)}
        onSave={(fields) => {
          if (!editCard) return
          const { imageFile, ...rest } = fields
          updateCard.mutate({ id: editCard.id, ...rest })
          if (imageFile) {
            updateCardImage.mutate({ id: editCard.id, file: imageFile })
          }
          setEditCard(null)
        }}
        onDelete={() => {
          if (editCard) {
            deleteCard.mutate(editCard.id)
          }
          setEditCard(null)
        }}
      />
    </div>
  )
}

function CardTableArea({
  view,
  selectedSetId,
  isLoading,
  columns,
  cards,
}: {
  view: 'sets' | 'all'
  selectedSetId: string | null
  isLoading: boolean
  columns: ColumnDef<AdminCard, unknown>[]
  cards: AdminCard[]
}) {
  if (view === 'sets' && !selectedSetId) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-full items-center justify-center text-sm text-text-light">
          Sélectionne un set pour voir ses cartes
        </div>
      </div>
    )
  }
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-full items-center justify-center text-sm text-text-light">
          Chargement…
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
      <ReactTable
        columns={columns}
        data={cards}
        filterId={`admin-cards-${view}`}
      />
    </div>
  )
}
