import { Pencil, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'
import {
  useAdminCreateSet,
  useAdminDeleteSet,
  useAdminSets,
  useAdminUpdateSet,
} from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'

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

  const sets = data?.sets ?? []

  return (
    <div className="flex w-52 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sets.map((set) => (
          <div
            key={set.id}
            className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
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
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-border text-text-light'
                  }`}
                >
                  {set.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            <div
              className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  updateSet.mutate({ id: set.id, isActive: !set.isActive })
                }
                title="Toggle actif"
              >
                <Power className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditSet(set)}
                title="Modifier"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-red-400 hover:text-red-400"
                onClick={() => deleteSet.mutate(set.id)}
                title="Supprimer"
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

function CreateSetSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const createSet = useAdminCreateSet()

  const form = useAppForm({
    defaultValues: { name: '', description: '' },
    onSubmit: ({ value }) => {
      createSet.mutate({
        name: value.name,
        description: value.description || undefined,
        isActive: false,
      })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau set</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-3"
          >
            <form.AppField name="name">
              {(f) => <f.Input label="Nom" />}
            </form.AppField>
            <form.AppField name="description">
              {(f) => <f.Input label="Description (optionnelle)" />}
            </form.AppField>
            <Button type="submit" className="w-full">
              Créer
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EditSetSheet({
  set,
  onOpenChange,
}: {
  set: AdminCardSet | null
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{set?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {set && (
          <div className="mt-6 px-6">
            <EditSetForm
              key={set.id}
              set={set}
              onClose={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditSetForm({
  set,
  onClose,
}: {
  set: AdminCardSet
  onClose: () => void
}) {
  const updateSet = useAdminUpdateSet()

  const form = useAppForm({
    defaultValues: {
      name: set.name,
      description: set.description ?? '',
      isActive: set.isActive,
    },
    onSubmit: ({ value }) => {
      updateSet.mutate({
        id: set.id,
        name: value.name,
        description: value.description || undefined,
        isActive: value.isActive,
      })
      onClose()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="isActive">
        {(f) => <f.Toggle label="Statut" options={['Actif', 'Inactif']} />}
      </form.AppField>
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="description">
        {(f) => <f.Input label="Description" />}
      </form.AppField>
      <Button type="submit" className="w-full">
        Sauvegarder
      </Button>
    </form>
  )
}
