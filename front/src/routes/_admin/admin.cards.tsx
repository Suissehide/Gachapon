import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useState } from 'react'

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
          cards={cards}
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
