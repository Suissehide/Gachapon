import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label.tsx'
import {
  type AdminConfig,
  useAdminConfig,
  useAdminSaveConfig,
} from '../../queries/useAdminConfig'

export const Route = createFileRoute('/_admin/admin/config')({
  component: AdminConfigPage,
})

const CONFIG_GROUPS = [
  {
    title: 'Tokens',
    fields: [
      {
        key: 'tokenRegenIntervalHours',
        label: 'Régénération (heures)',
        min: 0.5,
        step: 0.5,
      },
      { key: 'tokenMaxStock', label: 'Stock maximum', min: 1, step: 1 },
    ],
  },
  {
    title: 'Gacha',
    fields: [
      { key: 'pityThreshold', label: 'Seuil de pitié', min: 1, step: 1 },
    ],
  },
  {
    title: 'Dust par doublon',
    fields: [
      { key: 'dustCommon', label: 'Common', min: 0, step: 1 },
      { key: 'dustUncommon', label: 'Uncommon', min: 0, step: 1 },
      { key: 'dustRare', label: 'Rare', min: 0, step: 1 },
      { key: 'dustEpic', label: 'Epic', min: 0, step: 1 },
      { key: 'dustLegendary', label: 'Legendary', min: 0, step: 1 },
    ],
  },
] as const

function AdminConfigPage() {
  const { data, isLoading } = useAdminConfig()
  const save = useAdminSaveConfig()
  const [draft, setDraft] = useState<Partial<AdminConfig>>({})

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const current = { ...data, ...draft }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Configuration</h1>
        <Button
          onClick={() => {
            save.mutate(draft)
            setDraft({})
          }}
          disabled={Object.keys(draft).length === 0}
        >
          Sauvegarder
        </Button>
      </div>

      <div className="max-w-xl space-y-6">
        {CONFIG_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
              {group.title}
            </p>
            <div className="space-y-3">
              {group.fields.map(({ key, label, min, step }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <Label className="text-sm text-text">{label}</Label>
                  <Input
                    type="number"
                    min={min}
                    step={step}
                    value={current[key as keyof AdminConfig] ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))
                    }
                    className="w-28 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
