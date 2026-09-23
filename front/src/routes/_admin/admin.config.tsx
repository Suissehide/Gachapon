import { createFileRoute } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
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

function buildConfigGroups(t: TFunction<'admin'>) {
  return [
    {
      title: t('config.groups.tokens'),
      fields: [
        {
          key: 'tokenRegenIntervalMinutes',
          label: t('config.fields.tokenRegenMinutes'),
          min: 1,
          step: 1,
        },
        {
          key: 'tokenMaxStock',
          label: t('config.fields.tokenMaxStock'),
          min: 1,
          step: 1,
        },
      ],
    },
    {
      title: t('config.groups.gacha'),
      fields: [
        {
          key: 'pityThreshold',
          label: t('config.fields.pityThreshold'),
          min: 1,
          step: 1,
        },
      ],
    },
    {
      title: t('config.groups.dustPerDuplicate'),
      fields: [
        {
          key: 'dustCommon',
          label: t('common:cardRarity.common'),
          min: 0,
          step: 1,
        },
        {
          key: 'dustUncommon',
          label: t('common:cardRarity.uncommon'),
          min: 0,
          step: 1,
        },
        {
          key: 'dustRare',
          label: t('common:cardRarity.rare'),
          min: 0,
          step: 1,
        },
        {
          key: 'dustEpic',
          label: t('common:cardRarity.epic'),
          min: 0,
          step: 1,
        },
        {
          key: 'dustLegendary',
          label: t('common:cardRarity.legendary'),
          min: 0,
          step: 1,
        },
      ],
    },
  ] as const
}

function AdminConfigPage() {
  const { t } = useTranslation('admin')
  const { data, isLoading } = useAdminConfig()
  const save = useAdminSaveConfig()
  const [draft, setDraft] = useState<Partial<AdminConfig>>({})
  const configGroups = useMemo(() => buildConfigGroups(t), [t])

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        {t('config.loading')}
      </div>
    )
  }

  const current = { ...data, ...draft }

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={Settings}
        kicker={t('common.kicker.economy')}
        title={t('config.pageTitle')}
        subtitle={t('config.pageSubtitle')}
        actions={
          <Button
            onClick={() => {
              save.mutate(draft)
              setDraft({})
            }}
            disabled={Object.keys(draft).length === 0}
          >
            {t('config.save')}
          </Button>
        }
      />

      <div className="max-w-xl space-y-6">
        {configGroups.map((group) => (
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
