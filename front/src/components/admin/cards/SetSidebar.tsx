import { Pencil, Power, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('admin')
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
            placeholder={t('cards.sidebar.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredSets.map((set) => (
          // Le bouton de sélection et les actions sont frères (un <button>
          // ne peut pas en contenir d'autres) ; son `::after` couvre toute la
          // ligne pour qu'elle reste cliquable partout hors des actions.
          <div
            key={set.id}
            className={`group relative flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
              selectedSetId === set.id
                ? 'border border-primary/30 bg-primary/10'
                : 'hover:bg-surface'
            }`}
          >
            <Button
              variant="transparent"
              size="bare"
              onClick={() => onSelect(set.id)}
              aria-pressed={selectedSetId === set.id}
              className="block min-w-0 flex-1 text-left font-normal after:absolute after:inset-0 after:rounded-lg focus-visible:ring-2"
            >
              <span
                className={`block truncate text-sm font-medium ${
                  selectedSetId === set.id ? 'text-primary' : 'text-text'
                }`}
              >
                {set.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs text-text-light">
                  {set._count.cards}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    set.isActive
                      ? 'bg-success/20 text-success'
                      : 'bg-border text-text-light'
                  }`}
                >
                  {set.isActive
                    ? t('cards.setSheet.statusActive')
                    : t('cards.setSheet.statusInactive')}
                </span>
              </span>
            </Button>
            <div className="relative flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  updateSet.mutate({ id: set.id, isActive: !set.isActive })
                }
                title={t('cards.sidebar.toggleActiveTooltip')}
              >
                <Power className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditSet(set)}
                title={t('common.editTooltip')}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteSet.mutate(set.id)}
                title={t('common.deleteTooltip')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start text-xs"
          onClick={() => setShowCreate(true)}
        >
          {t('cards.sidebar.newSet')}
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
