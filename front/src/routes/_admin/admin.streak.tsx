import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Flame, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ReactTable } from '../../components/table/reactTable.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Input } from '../../components/ui/input.tsx'
import { Label } from '../../components/ui/label.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet.tsx'
import {
  type AdminMilestone,
  useAdminCreateMilestone,
  useAdminDeleteMilestone,
  useAdminPatchMilestone,
  useAdminPatchStreakDefault,
  useAdminStreak,
} from '../../queries/useAdminStreak.ts'

export const Route = createFileRoute('/_admin/admin/streak')({
  component: AdminStreakPage,
})

type DrawerMode =
  | { type: 'edit'; milestone: AdminMilestone }
  | { type: 'create' }
  | null

function AdminStreakPage() {
  const { data, isLoading } = useAdminStreak()
  const patchDefault = useAdminPatchStreakDefault()
  const createMilestone = useAdminCreateMilestone()
  const patchMilestone = useAdminPatchMilestone()
  const deleteMilestone = useAdminDeleteMilestone()

  const [defaultDraft, setDefaultDraft] = useState<{
    tokens?: number
    dust?: number
    xp?: number
  }>({})
  const [drawer, setDrawer] = useState<DrawerMode>(null)
  const [draft, setDraft] = useState({ day: '', tokens: '', dust: '', xp: '' })

  const openCreate = () => {
    setDraft({ day: '', tokens: '', dust: '', xp: '' })
    setDrawer({ type: 'create' })
  }

  const openEdit = (m: AdminMilestone) => {
    setDraft({
      day: String(m.day),
      tokens: String(m.tokens),
      dust: String(m.dust),
      xp: String(m.xp),
    })
    setDrawer({ type: 'edit', milestone: m })
  }

  const closeDrawer = () => setDrawer(null)

  const handleSaveDrawer = () => {
    const { day, tokens, dust, xp } = draft
    if (!tokens || !dust || !xp) {
      return
    }
    if (drawer?.type === 'create') {
      if (!day) {
        return
      }
      createMilestone.mutate(
        {
          day: Number(day),
          tokens: Number(tokens),
          dust: Number(dust),
          xp: Number(xp),
        },
        { onSuccess: closeDrawer },
      )
    } else if (drawer?.type === 'edit') {
      patchMilestone.mutate(
        {
          id: drawer.milestone.id,
          data: { tokens: Number(tokens), dust: Number(dust), xp: Number(xp) },
        },
        { onSuccess: closeDrawer },
      )
    }
  }

  const columns = useMemo<ColumnDef<AdminMilestone>[]>(
    () => [
      {
        accessorKey: 'day',
        header: 'Jour',
        size: 80,
        cell: ({ row }) => (
          <span className="tabular-nums text-text">
            Jour {row.original.day}
          </span>
        ),
      },
      {
        accessorKey: 'tokens',
        header: 'Tokens',
        size: 100,
        cell: ({ row }) => (
          <span className="tabular-nums text-text">{row.original.tokens}</span>
        ),
      },
      {
        accessorKey: 'dust',
        header: 'Dust',
        size: 100,
        cell: ({ row }) => (
          <span className="tabular-nums text-text">{row.original.dust}</span>
        ),
      },
      {
        accessorKey: 'xp',
        header: 'XP',
        size: 100,
        cell: ({ row }) => (
          <span className="tabular-nums text-text">{row.original.xp}</span>
        ),
      },
      {
        id: 'actions',
        size: 60,
        cell: ({ row }) => (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-text-light hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Supprimer le jalon du jour ${row.original.day} ?`)) {
                deleteMilestone.mutate(row.original.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [deleteMilestone],
  )

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const currentDefault = { ...data.default, ...defaultDraft }

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Flame className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-black text-text">Streak — Récompenses</h1>
      </div>

      {/* Default daily reward */}
      <section className="w-full">
        <div className="w-full flex items-center gap-4 mb-4">
          <h3 className="text-md font-semibold text-text-light">
            Récompense quotidienne par défaut
          </h3>
          <div className="flex-1 border-b border-border" />
        </div>
        <div className="flex justify-between rounded-md border border-border bg-card p-4">
          <div className="flex gap-4">
            {(['tokens', 'dust', 'xp'] as const).map((field) => (
              <div key={field} className="flex flex-col justify-between gap-1">
                <Label className="capitalize text-text">{field}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={currentDefault?.[field] ?? ''}
                  onChange={(e) =>
                    setDefaultDraft((d) => ({
                      ...d,
                      [field]: Number(e.target.value),
                    }))
                  }
                  className="w-28 text-right"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                patchDefault.mutate(defaultDraft, {
                  onSuccess: () => setDefaultDraft({}),
                })
              }}
              disabled={
                Object.keys(defaultDraft).length === 0 || patchDefault.isPending
              }
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      </section>

      {/* Milestones table */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/40 mb-4">
          <h3 className="text-md font-semibold text-text-light">
            Jalons spéciaux
          </h3>
          <div className="flex-1 border-b border-border" />
          <Button size="default" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau jalon
          </Button>
        </div>

        <ReactTable
          columns={columns}
          data={data.milestones}
          filterId="admin-streak-milestones"
          onRowClick={(row) => openEdit(row.original)}
        />
      </div>

      {/* Create / Edit drawer */}
      <Sheet
        open={drawer !== null}
        onOpenChange={(open) => !open && closeDrawer()}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {drawer?.type === 'create'
                ? 'Nouveau jalon'
                : `Jalon — Jour ${drawer?.type === 'edit' ? drawer.milestone.day : ''}`}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-6 py-5">
            {drawer?.type === 'create' && (
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.day}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, day: e.target.value }))
                  }
                  placeholder="ex: 7"
                />
              </div>
            )}
            {(['tokens', 'dust', 'xp'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label className="capitalize">{field}</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft[field]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field]: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSaveDrawer}
                disabled={createMilestone.isPending || patchMilestone.isPending}
              >
                {drawer?.type === 'create' ? 'Créer' : 'Sauvegarder'}
              </Button>
              <Button variant="outline" onClick={closeDrawer}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
