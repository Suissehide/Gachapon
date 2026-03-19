import { Pencil, Power, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { AdminCardSet } from '../../../queries/useAdminCards'
import {
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateSet,
} from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { CreateSetSheet } from './CreateSetSheet'
import { EditSetSheet } from './EditSetSheet'

interface SetSidebarProps {
  selectedSetId: string | null
  onSelect: (id: string) => void
}

export function SetSidebar({ selectedSetId, onSelect }: SetSidebarProps) {
  const { data } = useAdminSets()
  const updateSet = useAdminUpdateSet()
  const deleteSet = useAdminDeleteSet()
  const [showCreate, setShowCreate] = useState(false)
  const [editSet, setEditSet] = useState<AdminCardSet | null>(null)
  const [search, setSearch] = useState('')

  const sets = data?.sets ?? []
  const filteredSets = search
    ? sets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : sets

  return (
    <div className="flex w-58 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-light/50" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredSets.map((set) => (
          <button
            key={set.id}
            type="button"
            className={`group flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
              selectedSetId === set.id
                ? 'border border-primary/30 bg-primary/10'
                : 'hover:bg-surface'
            }`}
            onClick={() => onSelect(set.id)}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  selectedSetId === set.id ? 'text-primary' : 'text-text'
                }`}
              >
                {set.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-text-light">
                  {set._count.cards}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    set.isActive
                      ? 'bg-green-500/20 text-green-800'
                      : 'bg-border text-text-light'
                  }`}
                >
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  updateSet.mutate({ id: set.id, isActive: !set.isActive })
                }}
                title="Toggle actif"
              >
                <Power className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditSet(set)
                }}
                title="Modifier"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-red-400 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSet.mutate(set.id)
                }}
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-border p-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start text-xs"
          onClick={() => setShowCreate(true)}
        >
          + Nouveau set
        </Button>
      </div>

      <CreateSetSheet
        open={showCreate}
        onOpenChange={(o) => !o && setShowCreate(false)}
      />
      <EditSetSheet
        set={editSet}
        onOpenChange={(o) => !o && setEditSet(null)}
      />
    </div>
  )
}
