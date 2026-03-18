import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import notFoundImg from '../../assets/data/not-found.png'

import { Button } from '../../components/ui/button'
import { Input, Select } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAppForm } from '../../hooks/formConfig'
import {
  type AdminCard,
  useAdminCards,
  useAdminCreateCard,
  useAdminCreateSet,
  useAdminDeleteCard,
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateCard,
  useAdminUpdateSet,
} from '../../queries/useAdminCards'

export const Route = createFileRoute('/_admin/admin/cards')({
  component: AdminCards,
})

const RARITY_OPTIONS = [
  { value: 'COMMON', label: 'Common' },
  { value: 'UNCOMMON', label: 'Uncommon' },
  { value: 'RARE', label: 'Rare' },
  { value: 'EPIC', label: 'Epic' },
  { value: 'LEGENDARY', label: 'Legendary' },
]

function AdminCards() {
  const { data: setsData } = useAdminSets()
  const { data: cardsData } = useAdminCards()
  const createSet = useAdminCreateSet()
  const updateSet = useAdminUpdateSet()
  const deleteSet = useAdminDeleteSet()
  const createCard = useAdminCreateCard()
  const updateCard = useAdminUpdateCard()
  const deleteCard = useAdminDeleteCard()

  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [newSetName, setNewSetName] = useState('')
  const [showNewSetForm, setShowNewSetForm] = useState(false)
  const [editingCard, setEditingCard] = useState<AdminCard | null>(null)

  const sets = setsData?.sets ?? []
  const cards = cardsData?.cards ?? []

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Cartes & Sets</h1>
        <Button size="sm" onClick={() => setShowNewSetForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nouveau set
        </Button>
      </div>

      {showNewSetForm && (
        <div className="mb-4 flex gap-2 rounded-xl border border-border bg-card p-4">
          <Input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="Nom du set…"
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={() => {
              createSet.mutate({ name: newSetName, isActive: false })
              setNewSetName('')
              setShowNewSetForm(false)
            }}
          >
            Créer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewSetForm(false)}>
            Annuler
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {sets.map((set) => {
          const setCards = cards.filter((c) => c.set.id === set.id)
          const isOpen = expandedSetId === set.id
          return (
            <div key={set.id} className="rounded-xl border border-border bg-card">
              <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3"
                onClick={() => setExpandedSetId(isOpen ? null : set.id)}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-text-light" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-light" />
                )}
                <span className="font-semibold text-text">{set.name}</span>
                <span className="ml-1 text-xs text-text-light">{set._count.cards} cartes</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${set.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-text-light'}`}
                >
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
                <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => updateSet.mutate({ id: set.id, isActive: !set.isActive })}
                  >
                    {set.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    onClick={() => deleteSet.mutate(set.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-4">
                  <div className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {setCards.map((card) => (
                      <div
                        key={card.id}
                        className="group relative cursor-pointer"
                        onClick={() => setEditingCard(card)}
                      >
                        <img
                          src={card.imageUrl || notFoundImg}
                          alt={card.name}
                          className="aspect-[3/4] w-full rounded-lg object-cover"
                        />
                        <div className="absolute inset-0 flex items-end rounded-lg bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="w-full truncate text-center text-xs font-bold text-white">
                            {card.name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCard.mutate(card.id)
                          }}
                          className="absolute right-1 top-1 hidden rounded bg-red-500 p-0.5 group-hover:block"
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <CardUploadForm setId={set.id} onUpload={(fd) => createCard.mutate(fd)} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingCard && (
        <CardEditForm
          card={editingCard}
          onSave={(data) => {
            updateCard.mutate({ id: editingCard.id, ...data })
            setEditingCard(null)
          }}
          onCancel={() => setEditingCard(null)}
        />
      )}
    </div>
  )
}

function CardEditForm({
  card,
  onSave,
  onCancel,
}: {
  card: AdminCard
  onSave: (data: { name: string; rarity: string; dropWeight: number }) => void
  onCancel: () => void
}) {
  const form = useAppForm({
    defaultValues: {
      name: card.name,
      rarity: card.rarity,
      dropWeight: card.dropWeight as number | undefined,
    },
    onSubmit: ({ value }) => {
      onSave({ name: value.name, rarity: value.rarity, dropWeight: value.dropWeight ?? 0 })
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-80 space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold text-text">Modifier la carte</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-3"
        >
          <form.AppField name="name">
            {(field) => <field.Input label="Nom" />}
          </form.AppField>
          <form.AppField name="rarity">
            {(field) => <field.Select label="Rareté" options={RARITY_OPTIONS} />}
          </form.AppField>
          <form.AppField name="dropWeight">
            {(field) => <field.Number label="Poids de drop" />}
          </form.AppField>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Sauvegarder
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CardUploadForm({
  setId,
  onUpload,
}: {
  setId: string
  onUpload: (fd: FormData) => void
}) {
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState('COMMON')
  const [dropWeight, setDropWeight] = useState('10')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)

  const submit = () => {
    if (!name || !file) return
    const fd = new FormData()
    fd.append('name', name)
    fd.append('setId', setId)
    fd.append('rarity', rarity)
    fd.append('dropWeight', dropWeight)
    fd.append('image', file)
    onUpload(fd)
    setName('')
    setFile(null)
    setFileKey((k) => k + 1)
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-light">
        Ajouter une carte
      </p>
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <Label>Nom</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la carte"
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Rareté</Label>
          <Select
            id="upload-rarity"
            options={RARITY_OPTIONS}
            value={rarity}
            onValueChange={setRarity}
            clearable={false}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Poids</Label>
          <Input
            type="number"
            value={dropWeight}
            onChange={(e) => setDropWeight(e.target.value)}
            placeholder="Poids"
            className="w-20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Image</Label>
          <input
            key={fileKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-text-light"
          />
        </div>
        <div className="flex items-end">
          <Button size="sm" onClick={submit} disabled={!name || !file}>
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  )
}
