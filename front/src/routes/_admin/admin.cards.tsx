// front/src/routes/_admin/admin.cards.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import {
  useAdminCards,
  useAdminCreateCard,
  useAdminCreateSet,
  useAdminDeleteCard,
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateSet,
} from '../../queries/useAdminCards'

export const Route = createFileRoute('/_admin/admin/cards')({
  component: AdminCards,
})

function AdminCards() {
  const { data: setsData } = useAdminSets()
  const { data: cardsData } = useAdminCards()
  const createSet = useAdminCreateSet()
  const updateSet = useAdminUpdateSet()
  const deleteSet = useAdminDeleteSet()
  const createCard = useAdminCreateCard()
  const deleteCard = useAdminDeleteCard()

  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [newSetName, setNewSetName] = useState('')
  const [showNewSetForm, setShowNewSetForm] = useState(false)

  const sets = setsData?.sets ?? []
  const cards = cardsData?.cards ?? []

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Cartes & Sets</h1>
        <Button size="sm" onClick={() => setShowNewSetForm(true)}><Plus className="mr-1 h-4 w-4" />Nouveau set</Button>
      </div>

      {showNewSetForm && (
        <div className="mb-4 flex gap-2 rounded-xl border border-border bg-card p-4">
          <input value={newSetName} onChange={(e) => setNewSetName(e.target.value)}
            placeholder="Nom du set…" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          <Button size="sm" onClick={() => {
            createSet.mutate({ name: newSetName, isActive: false })
            setNewSetName('')
            setShowNewSetForm(false)
          }}>Créer</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewSetForm(false)}>Annuler</Button>
        </div>
      )}

      <div className="space-y-2">
        {sets.map((set) => {
          const setCards = cards.filter((c) => c.set.id === set.id)
          const isOpen = expandedSetId === set.id
          return (
            <div key={set.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedSetId(isOpen ? null : set.id)}>
                {isOpen ? <ChevronDown className="h-4 w-4 text-text-light" /> : <ChevronRight className="h-4 w-4 text-text-light" />}
                <span className="font-semibold text-text">{set.name}</span>
                <span className="ml-1 text-xs text-text-light">{set._count.cards} cartes</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${set.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-text-light'}`}>
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
                <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="text-xs"
                    onClick={() => updateSet.mutate({ id: set.id, isActive: !set.isActive })}>
                    {set.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400"
                    onClick={() => deleteSet.mutate(set.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border p-4">
                  <div className="mb-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                    {setCards.map((card) => (
                      <div key={card.id} className="group relative">
                        <img src={card.imageUrl} alt={card.name}
                          className="aspect-[3/4] w-full rounded-lg object-cover" />
                        <div className="absolute inset-0 flex items-end rounded-lg bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <p className="w-full truncate text-center text-xs font-bold text-white">{card.name}</p>
                        </div>
                        <button onClick={() => deleteCard.mutate(card.id)}
                          className="absolute right-1 top-1 hidden rounded bg-red-500 p-0.5 group-hover:block">
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
    </div>
  )
}

function CardUploadForm({ setId, onUpload }: { setId: string; onUpload: (fd: FormData) => void }) {
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState('COMMON')
  const [dropWeight, setDropWeight] = useState('10')
  const [file, setFile] = useState<File | null>(null)

  const submit = () => {
    if (!name || !file) return
    const fd = new FormData()
    fd.append('name', name)
    fd.append('setId', setId)
    fd.append('rarity', rarity)
    fd.append('dropWeight', dropWeight)
    fd.append('image', file)
    onUpload(fd)
    setName(''); setFile(null)
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la carte"
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text w-36" />
      <select value={rarity} onChange={(e) => setRarity(e.target.value)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text">
        {['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY'].map((r) => <option key={r}>{r}</option>)}
      </select>
      <input type="number" value={dropWeight} onChange={(e) => setDropWeight(e.target.value)}
        placeholder="Poids" className="rounded border border-border bg-surface px-2 py-1 text-xs text-text w-20" />
      <input type="file" accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs text-text-light" />
      <Button size="sm" onClick={submit} disabled={!name || !file}>Ajouter</Button>
    </div>
  )
}
