import { createFileRoute } from '@tanstack/react-router'
import { Skull } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminRaidBoss, AdminRaidTier } from '../../api/admin-raid.api.ts'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import {
  ELEMENT_LABELS,
  RARITY_OPTIONS,
} from '../../constants/card.constant.ts'
import { useAppForm } from '../../hooks/formConfig.tsx'
import {
  useAdminPatchRaidBoss,
  useAdminPatchRaidTier,
  useAdminRaidBosses,
  useAdminRaidTiers,
} from '../../queries/useAdminRaid.ts'

export const Route = createFileRoute('/_admin/admin/raid')({
  component: AdminRaidPage,
})

type Tab = 'bosses' | 'tiers'

function AdminRaidPage() {
  const { t } = useTranslation('admin')
  const [tab, setTab] = useState<Tab>('bosses')
  return (
    <div className="p-8">
      <AdminPageHeader
        icon={Skull}
        kicker={t('common.kicker.community')}
        title={t('raid.pageTitle')}
        subtitle={t('raid.pageSubtitle')}
      />
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bosses', label: t('raid.tabBosses') },
          { value: 'tiers', label: t('raid.tabTiers') },
        ]}
      />
      <div className="mt-6">
        {tab === 'bosses' ? <BossesTab /> : <TiersTab />}
      </div>
    </div>
  )
}

function BossesTab() {
  const { t } = useTranslation('admin')
  const { data, isLoading } = useAdminRaidBosses()
  if (isLoading || !data) {
    return <p className="text-text-light">{t('raid.loading')}</p>
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.bosses.map((b) => (
        <BossForm key={b.element} boss={b} />
      ))}
    </div>
  )
}

function BossForm({ boss }: { boss: AdminRaidBoss }) {
  const { t } = useTranslation('admin')
  const patch = useAdminPatchRaidBoss()
  const form = useAppForm({
    defaultValues: {
      nameFr: boss.nameFr,
      nameEn: boss.nameEn,
      appearance: boss.spec.appearance ?? '',
      baseAtk: boss.spec.baseAtk as number | undefined,
      baseDef: boss.spec.baseDef as number | undefined,
      baseSpd: boss.spec.baseSpd as number | undefined,
      mitigationScale: boss.spec.mitigationScale as number | undefined,
      attackPattern: boss.spec.attackPattern ?? 'BASIC',
      passiveKey: boss.spec.passiveKey ?? '',
    },
    // Un champ numérique vidé passe à `undefined` (voir NumberField dans
    // formConfig.tsx) : sans ce garde-fou, `Number(undefined)` vaut NaN et
    // part silencieusement dans la requête. On ne teste que `undefined`,
    // pas la valeur falsy — 0 est une valeur légitime pour ces champs.
    validators: {
      onSubmit: ({ value }) => {
        const fields: Record<string, string> = {}
        if (value.baseAtk === undefined) {
          fields.baseAtk = t('raid.requiredValue')
        }
        if (value.baseDef === undefined) {
          fields.baseDef = t('raid.requiredValue')
        }
        if (value.baseSpd === undefined) {
          fields.baseSpd = t('raid.requiredValue')
        }
        if (value.mitigationScale === undefined) {
          fields.mitigationScale = t('raid.requiredValue')
        }
        if (Object.keys(fields).length > 0) {
          return { fields, form: Object.values(fields)[0] }
        }
        return undefined
      },
    },
    onSubmit: ({ value }) =>
      patch.mutate({
        element: boss.element,
        data: {
          nameFr: value.nameFr,
          nameEn: value.nameEn,
          // On repart du spec chargé (`...boss.spec`) pour ne jamais perdre
          // un champ que ce formulaire n'expose pas (level, palier, crit…) —
          // le PATCH remplace tout l'objet spec côté back.
          spec: {
            ...boss.spec,
            appearance: value.appearance || null,
            baseAtk: Number(value.baseAtk),
            baseDef: Number(value.baseDef),
            baseSpd: Number(value.baseSpd),
            mitigationScale: Number(value.mitigationScale),
            attackPattern: value.attackPattern,
            passiveKey: value.passiveKey || null,
          },
        },
      }),
  })
  return (
    <form
      className="rounded-2xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        {ELEMENT_LABELS[boss.element]}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="nameFr">
          {(f) => <f.Input label={t('raid.boss.nameFrLabel')} />}
        </form.AppField>
        <form.AppField name="nameEn">
          {(f) => <f.Input label={t('raid.boss.nameEnLabel')} />}
        </form.AppField>
        <form.AppField name="appearance">
          {(f) => <f.Input label={t('raid.boss.appearanceLabel')} />}
        </form.AppField>
        <form.AppField name="baseAtk">
          {(f) => <f.Number label={t('raid.boss.baseAtkLabel')} />}
        </form.AppField>
        <form.AppField name="baseDef">
          {(f) => <f.Number label={t('raid.boss.baseDefLabel')} />}
        </form.AppField>
        <form.AppField name="baseSpd">
          {(f) => <f.Number label={t('raid.boss.baseSpdLabel')} />}
        </form.AppField>
        <form.AppField name="mitigationScale">
          {(f) => <f.Number label={t('raid.boss.mitigationScaleLabel')} />}
        </form.AppField>
        <form.AppField name="attackPattern">
          {(f) => (
            <f.Select
              label={t('raid.boss.attackPatternLabel')}
              options={[
                'BASIC',
                'AOE_3',
                'MULTI_2',
                'MONO_AMPLIFIED',
                'MONO_DOUBLE',
              ].map((v) => ({ value: v, label: v }))}
            />
          )}
        </form.AppField>
        <form.AppField name="passiveKey">
          {(f) => <f.Input label={t('raid.boss.passiveKeyLabel')} />}
        </form.AppField>
      </div>
      <div className="mt-4 flex justify-end">
        <form.AppForm>
          <form.SubmitButton>{t('raid.boss.save')}</form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  )
}

function TiersTab() {
  const { t } = useTranslation('admin')
  const { data, isLoading } = useAdminRaidTiers()
  if (isLoading || !data) {
    return <p className="text-text-light">{t('raid.loading')}</p>
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.tiers.map((t) => (
        <TierForm key={t.pct} tier={t} />
      ))}
    </div>
  )
}

function TierForm({ tier }: { tier: AdminRaidTier }) {
  const { t } = useTranslation('admin')
  const patch = useAdminPatchRaidTier()
  const form = useAppForm({
    defaultValues: {
      tokens: tier.tokens as number | undefined,
      gold: tier.gold as number | undefined,
      dust: tier.dust as number | undefined,
      xp: tier.xp as number | undefined,
      cardRarity: tier.cardRarity ?? '',
    },
    // Même garde-fou que BossForm : un champ vidé vaut `undefined`, pas 0 —
    // sans ça `Number(undefined)` (NaN) partirait silencieusement en requête.
    validators: {
      onSubmit: ({ value }) => {
        const fields: Record<string, string> = {}
        if (value.tokens === undefined) {
          fields.tokens = t('raid.requiredValue')
        }
        if (value.gold === undefined) {
          fields.gold = t('raid.requiredValue')
        }
        if (value.dust === undefined) {
          fields.dust = t('raid.requiredValue')
        }
        if (value.xp === undefined) {
          fields.xp = t('raid.requiredValue')
        }
        if (Object.keys(fields).length > 0) {
          return { fields, form: Object.values(fields)[0] }
        }
        return undefined
      },
    },
    onSubmit: ({ value }) =>
      patch.mutate({
        pct: tier.pct,
        data: {
          tokens: Number(value.tokens),
          gold: Number(value.gold),
          dust: Number(value.dust),
          xp: Number(value.xp),
          cardRarity: value.cardRarity
            ? (value.cardRarity as AdminRaidTier['cardRarity'])
            : null,
        },
      }),
  })
  return (
    <form
      className="rounded-2xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="mb-4 font-display text-xl font-bold text-text">
        {tier.pct} %
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="tokens">
          {(f) => <f.Number label={t('raid.tier.tokensLabel')} />}
        </form.AppField>
        <form.AppField name="gold">
          {(f) => <f.Number label={t('raid.tier.goldLabel')} />}
        </form.AppField>
        <form.AppField name="dust">
          {(f) => <f.Number label={t('raid.tier.dustLabel')} />}
        </form.AppField>
        <form.AppField name="xp">
          {(f) => <f.Number label={t('raid.tier.xpLabel')} />}
        </form.AppField>
        <form.AppField name="cardRarity">
          {(f) => (
            <f.Select
              label={t('raid.tier.guaranteedCardLabel')}
              clearable
              options={RARITY_OPTIONS}
            />
          )}
        </form.AppField>
      </div>
      <div className="mt-4 flex justify-end">
        <form.AppForm>
          <form.SubmitButton>{t('raid.tier.save')}</form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  )
}
