import { createFileRoute } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label.tsx'
import type { ScoringConfig } from '../../queries/useScoring'
import {
  useScoringConfig,
  useUpdateScoringConfig,
} from '../../queries/useScoring'

export const Route = createFileRoute('/_admin/admin/scoring')({
  component: AdminScoringPage,
})

function buildRarityFields(
  t: TFunction<'admin'>,
): { key: keyof ScoringConfig; label: string }[] {
  return [
    { key: 'commonPoints', label: t('scoring.fields.commonPoints') },
    { key: 'uncommonPoints', label: t('scoring.fields.uncommonPoints') },
    { key: 'rarePoints', label: t('scoring.fields.rarePoints') },
    { key: 'epicPoints', label: t('scoring.fields.epicPoints') },
    { key: 'legendaryPoints', label: t('scoring.fields.legendaryPoints') },
  ]
}

function buildMultiplierFields(
  t: TFunction<'admin'>,
): { key: keyof ScoringConfig; label: string }[] {
  return [
    {
      key: 'brilliantMultiplier',
      label: t('scoring.fields.brilliantMultiplier'),
    },
    {
      key: 'holographicMultiplier',
      label: t('scoring.fields.holographicMultiplier'),
    },
  ]
}

function AdminScoringPage() {
  const { t } = useTranslation('admin')
  const { data, isLoading } = useScoringConfig()
  const update = useUpdateScoringConfig()
  const [draft, setDraft] = useState<ScoringConfig | null>(null)
  const rarityFields = useMemo(() => buildRarityFields(t), [t])
  const multiplierFields = useMemo(() => buildMultiplierFields(t), [t])

  useEffect(() => {
    if (data && !draft) {
      setDraft(data)
    }
  }, [data, draft])

  if (isLoading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        {t('scoring.loading')}
      </div>
    )
  }

  const handleSave = () => {
    update.mutate(draft)
  }

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={Trophy}
        kicker={t('common.kicker.economy')}
        title={t('scoring.pageTitle')}
        subtitle={t('scoring.pageSubtitle')}
        actions={
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? t('scoring.saving') : t('scoring.save')}
          </Button>
        }
      />

      <div className="max-w-md space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            {t('scoring.rarityPointsTitle')}
          </p>
          <div className="space-y-3">
            {rarityFields.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <Label className="text-sm font-semibold text-text">
                  {label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={draft[key] as number}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, [key]: Number(e.target.value) } : d,
                    )
                  }
                  className="w-24 text-right"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            {t('scoring.variantMultipliersTitle')}
          </p>
          <div className="space-y-3">
            {multiplierFields.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <Label className="text-sm font-semibold text-text">
                  {label}
                </Label>
                <Input
                  type="number"
                  min={1.0}
                  step={0.1}
                  value={draft[key] as number}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, [key]: Number(e.target.value) } : d,
                    )
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
