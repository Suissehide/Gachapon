import { createFileRoute } from '@tanstack/react-router'
import { Flame, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button.tsx'
import { Input } from '../../components/ui/input.tsx'
import { Label } from '../../components/ui/label.tsx'
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

function AdminStreakPage() {
  const { data, isLoading } = useAdminStreak()
  const patchDefault = useAdminPatchStreakDefault()
  const createMilestone = useAdminCreateMilestone()
  const patchMilestone = useAdminPatchMilestone()
  const deleteMilestone = useAdminDeleteMilestone()

  const [defaultDraft, setDefaultDraft] = useState<{ tokens?: number; dust?: number; xp?: number }>({})
  const [newMilestone, setNewMilestone] = useState({ day: '', tokens: '', dust: '', xp: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<AdminMilestone>>({})

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const currentDefault = { ...data.default, ...defaultDraft }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Flame className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-black text-text">Streak — Récompenses</h1>
      </div>

      {/* Default daily reward */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
          Récompense quotidienne par défaut
        </p>
        <div className="space-y-3">
          {(['tokens', 'dust', 'xp'] as const).map((field) => (
            <div key={field} className="flex items-center justify-between gap-4">
              <Label className="text-sm text-text capitalize">{field}</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={currentDefault?.[field] ?? ''}
                onChange={(e) =>
                  setDefaultDraft((d) => ({ ...d, [field]: Number(e.target.value) }))
                }
                className="w-28 text-right"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => {
              patchDefault.mutate(defaultDraft)
              setDefaultDraft({})
            }}
            disabled={Object.keys(defaultDraft).length === 0 || patchDefault.isPending}
          >
            Sauvegarder
          </Button>
        </div>
      </section>

      {/* Milestones table */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
          Jalons spéciaux
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold text-text-light">
              <th className="pb-2 text-left">Jour</th>
              <th className="pb-2 text-right">Tokens</th>
              <th className="pb-2 text-right">Dust</th>
              <th className="pb-2 text-right">XP</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {data.milestones.map((m) => (
              <tr key={m.id} className="border-b border-border/50 last:border-0">
                {editingId === m.id ? (
                  <>
                    <td className="py-2 font-bold text-primary">Jour {m.day}</td>
                    {(['tokens', 'dust', 'xp'] as const).map((f) => (
                      <td key={f} className="py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          value={editDraft[f] ?? m[f]}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, [f]: Number(e.target.value) }))
                          }
                          className="ml-auto w-20 text-right"
                        />
                      </td>
                    ))}
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            patchMilestone.mutate({ id: m.id, data: editDraft })
                            setEditingId(null)
                            setEditDraft({})
                          }}
                          disabled={patchMilestone.isPending}
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingId(null); setEditDraft({}) }}
                        >
                          ✕
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td
                      className="py-2 font-semibold text-text cursor-pointer hover:text-primary"
                      onClick={() => { setEditingId(m.id); setEditDraft({}) }}
                    >
                      Jour {m.day}
                    </td>
                    <td className="py-2 text-right tabular-nums">{m.tokens}</td>
                    <td className="py-2 text-right tabular-nums">{m.dust}</td>
                    <td className="py-2 text-right tabular-nums">{m.xp}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-text-light hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer le jalon du jour ${m.day} ?`)) {
                            deleteMilestone.mutate(m.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add new milestone row */}
        <div className="mt-4 flex items-end gap-2 border-t border-border/50 pt-4">
          {[
            { key: 'day', label: 'Jour', min: 1 },
            { key: 'tokens', label: 'Tokens', min: 0 },
            { key: 'dust', label: 'Dust', min: 0 },
            { key: 'xp', label: 'XP', min: 0 },
          ].map(({ key, label, min }) => (
            <div key={key} className="flex-1">
              <Label className="mb-1 text-xs text-text-light">{label}</Label>
              <Input
                type="number"
                min={min}
                value={newMilestone[key as keyof typeof newMilestone]}
                onChange={(e) =>
                  setNewMilestone((d) => ({ ...d, [key]: e.target.value }))
                }
                className="text-right"
              />
            </div>
          ))}
          <Button
            onClick={() => {
              const { day, tokens, dust, xp } = newMilestone
              if (!day || !tokens || !dust || !xp) return
              createMilestone.mutate({
                day: Number(day),
                tokens: Number(tokens),
                dust: Number(dust),
                xp: Number(xp),
              })
              setNewMilestone({ day: '', tokens: '', dust: '', xp: '' })
            }}
            disabled={createMilestone.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  )
}
