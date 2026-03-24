import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label.tsx'
import type { ScoringConfig } from '../../queries/useScoring'
import { useScoringConfig, useUpdateScoringConfig } from '../../queries/useScoring'

export const Route = createFileRoute('/_admin/admin/scoring')({
  component: AdminScoringPage,
})

const RARITY_FIELDS: { key: keyof ScoringConfig; label: string }[] = [
  { key: 'commonPoints', label: '⬜ Commun' },
  { key: 'uncommonPoints', label: '🟩 Peu commun' },
  { key: 'rarePoints', label: '🔷 Rare' },
  { key: 'epicPoints', label: '🟣 Épique' },
  { key: 'legendaryPoints', label: '🌟 Légendaire' },
]

const MULTIPLIER_FIELDS: { key: keyof ScoringConfig; label: string }[] = [
  { key: 'brilliantMultiplier', label: '☀️ Multiplicateur Brillant' },
  { key: 'holographicMultiplier', label: '🌊 Multiplicateur Holographique' },
]

function AdminScoringPage() {
  const { data, isLoading } = useScoringConfig()
  const update = useUpdateScoringConfig()
  const [draft, setDraft] = useState<ScoringConfig | null>(null)

  useEffect(() => {
    if (data && !draft) setDraft(data)
  }, [data, draft])

  if (isLoading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const handleSave = () => {
    update.mutate(draft)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Scoring — Configuration</h1>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
      </div>

      <div className="max-w-md space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            Points par rareté
          </p>
          <div className="space-y-3">
            {RARITY_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-sm font-semibold text-text">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={draft[key] as number}
                  onChange={(e) =>
                    setDraft((d) => d ? { ...d, [key]: Number(e.target.value) } : d)
                  }
                  className="w-24 text-right"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            Multiplicateurs de variante
          </p>
          <div className="space-y-3">
            {MULTIPLIER_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="text-sm font-semibold text-text">{label}</Label>
                <Input
                  type="number"
                  min={1.0}
                  step={0.1}
                  value={draft[key] as number}
                  onChange={(e) =>
                    setDraft((d) => d ? { ...d, [key]: Number(e.target.value) } : d)
                  }
                  className="w-24 text-right"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
