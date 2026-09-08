import { createFileRoute } from '@tanstack/react-router'
import { Skull } from 'lucide-react'
import { useState } from 'react'

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
  const [tab, setTab] = useState<Tab>('bosses')
  return (
    <div className="p-8">
      <AdminPageHeader
        icon={Skull}
        kicker="Communauté"
        title="Raid d'équipe"
        subtitle="Boss par élément et lots des paliers 25/50/75/100 %."
      />
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bosses', label: 'Boss' },
          { value: 'tiers', label: 'Paliers' },
        ]}
      />
      <div className="mt-6">
        {tab === 'bosses' ? <BossesTab /> : <TiersTab />}
      </div>
    </div>
  )
}

function BossesTab() {
  const { data, isLoading } = useAdminRaidBosses()
  if (isLoading || !data) {
    return <p className="text-text-light">Chargement…</p>
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
  const patch = useAdminPatchRaidBoss()
  const form = useAppForm({
    defaultValues: {
      name: boss.name,
      appearance: boss.spec.appearance ?? '',
      baseAtk: boss.spec.baseAtk as number | undefined,
      baseDef: boss.spec.baseDef as number | undefined,
      baseSpd: boss.spec.baseSpd as number | undefined,
      mitigationScale: boss.spec.mitigationScale as number | undefined,
      attackPattern: boss.spec.attackPattern ?? 'BASIC',
      passiveKey: boss.spec.passiveKey ?? '',
    },
    onSubmit: ({ value }) =>
      patch.mutate({
        element: boss.element,
        data: {
          name: value.name,
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
        <form.AppField name="name">
          {(f) => <f.Input label="Nom" />}
        </form.AppField>
        <form.AppField name="appearance">
          {(f) => (
            <f.Input label="Image (clé MinIO, ex. monsters/bosses/BOSS-010)" />
          )}
        </form.AppField>
        <form.AppField name="baseAtk">
          {(f) => <f.Number label="ATK de base" />}
        </form.AppField>
        <form.AppField name="baseDef">
          {(f) => <f.Number label="DEF de base" />}
        </form.AppField>
        <form.AppField name="baseSpd">
          {(f) => <f.Number label="VIT de base" />}
        </form.AppField>
        <form.AppField name="mitigationScale">
          {(f) => <f.Number label="Échelle de mitigation" />}
        </form.AppField>
        <form.AppField name="attackPattern">
          {(f) => (
            <f.Select
              label="Pattern d'attaque"
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
          {(f) => <f.Input label="Passif (clé, vide = aucun)" />}
        </form.AppField>
      </div>
      <div className="mt-4 flex justify-end">
        <form.AppForm>
          <form.SubmitButton>Enregistrer</form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  )
}

function TiersTab() {
  const { data, isLoading } = useAdminRaidTiers()
  if (isLoading || !data) {
    return <p className="text-text-light">Chargement…</p>
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
  const patch = useAdminPatchRaidTier()
  const form = useAppForm({
    defaultValues: {
      tokens: tier.tokens as number | undefined,
      gold: tier.gold as number | undefined,
      dust: tier.dust as number | undefined,
      xp: tier.xp as number | undefined,
      cardRarity: tier.cardRarity ?? '',
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
          {(f) => <f.Number label="Jetons" />}
        </form.AppField>
        <form.AppField name="gold">
          {(f) => <f.Number label="Or" />}
        </form.AppField>
        <form.AppField name="dust">
          {(f) => <f.Number label="Poussière" />}
        </form.AppField>
        <form.AppField name="xp">
          {(f) => <f.Number label="XP" />}
        </form.AppField>
        <form.AppField name="cardRarity">
          {(f) => (
            <f.Select
              label="Carte garantie"
              clearable
              options={RARITY_OPTIONS}
            />
          )}
        </form.AppField>
      </div>
      <div className="mt-4 flex justify-end">
        <form.AppForm>
          <form.SubmitButton>Enregistrer</form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  )
}
