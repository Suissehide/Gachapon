import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { LayoutGrid, List, Plus } from 'lucide-react'
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
import { RARITY_OPTIONS } from '../../constants/card.constant'
import {
  type AdminCard,
  useAdminCards,
  useAdminCreateCard,
  useAdminDeleteCard,
  useAdminSets,
  useAdminUpdateCard,
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
  const { data: cardsData, isLoading } = useAdminCards(
    view === 'sets' ? { setId: selectedSetId ?? undefined } : {},
    { enabled: view === 'all' || !!selectedSetId },
  )

  const createCard = useAdminCreateCard()
  const updateCard = useAdminUpdateCard()
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
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === 'sets'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-light hover:text-text'
              }`}
              onClick={() => setView('sets')}
              title="Vue par sets"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-light hover:text-text'
              }`}
              onClick={() => setView('all')}
              title="Toutes les cartes"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            disabled={view === 'sets' && !selectedSetId}
          >
            <Plus className="h-4 w-4" />
            Nouvelle carte
          </Button>
        </div>
      </div>

      <CardVariantPanel />

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher une carte…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-52 text-sm"
        />
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
          if (editCard) {
            updateCard.mutate({ id: editCard.id, ...fields })
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
