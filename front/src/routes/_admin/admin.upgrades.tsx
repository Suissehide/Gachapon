import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label.tsx'
import { type UpgradeConfigRow, useAdminSaveUpgrades, useAdminUpgrades } from '../../queries/useAdminUpgrades'

export const Route = createFileRoute('/_admin/admin/upgrades')({
  component: AdminUpgradesPage,
})

const UPGRADE_LABELS: Record<string, string> = {
  REGEN: '⚡ Accélération',
  LUCK: '✨ Chance',
  DUST_HARVEST: '💎 Récolteur',
  TOKEN_VAULT: '🎫 Réserve',
}

const EFFECT_LABEL: Record<string, string> = {
  REGEN: 'min retirées',
  LUCK: 'multiplicateur',
  DUST_HARVEST: 'multiplicateur',
  TOKEN_VAULT: 'tokens bonus',
}

function AdminUpgradesPage() {
  const { data, isLoading } = useAdminUpgrades()
  const save = useAdminSaveUpgrades()
  const [draft, setDraft] = useState<Record<string, Partial<UpgradeConfigRow>>>({})

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
  }

  const rowKey = (type: string, level: number) => `${type}-${level}`

  const current = (row: UpgradeConfigRow): UpgradeConfigRow => ({
    ...row,
    ...(draft[rowKey(row.type, row.level)] ?? {}),
  })

  const handleChange = (type: string, level: number, field: 'effect' | 'dustCost', value: number) => {
    const key = rowKey(type, level)
    setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }))
  }

  const handleSave = () => {
    const updates = data.map((row) => current(row))
    save.mutate(updates, { onSuccess: () => setDraft({}) })
  }

  const grouped = ['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT'].map((type) => ({
    type,
    rows: data.filter((r) => r.type === type).sort((a, b) => a.level - b.level),
  }))

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Améliorations — Configuration</h1>
        <Button onClick={handleSave} disabled={Object.keys(draft).length === 0}>
          Sauvegarder
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        {grouped.map(({ type, rows }) => (
          <div key={type} className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              {UPGRADE_LABELS[type]}
            </p>
            <div className="space-y-3">
              {rows.map((row) => {
                const c = current(row)
                return (
                  <div key={row.level} className="flex items-center justify-between gap-4">
                    <Label className="w-16 shrink-0 text-sm font-semibold text-text">
                      Niveau {['I', 'II', 'III', 'IV'][row.level - 1]}
                    </Label>
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        type="number"
                        step={type === 'LUCK' || type === 'DUST_HARVEST' ? 0.01 : 1}
                        min={0.01}
                        value={c.effect}
                        onChange={(e) => handleChange(type, row.level, 'effect', Number(e.target.value))}
                        className="w-24 text-right"
                      />
                      <span className="text-xs text-text-light">{EFFECT_LABEL[type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step={100}
                        min={0}
                        value={c.dustCost}
                        onChange={(e) => handleChange(type, row.level, 'dustCost', Number(e.target.value))}
                        className="w-28 text-right"
                      />
                      <span className="text-xs text-text-light">dust</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
