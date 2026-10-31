import { createFileRoute } from '@tanstack/react-router'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { CapsuleStage } from '../../components/machine/capsule/CapsuleStage'
import {
  CAPSULE_KINDS,
  type CapsuleKind,
  type TeaseTier,
} from '../../components/machine/capsule/capsuleConfig'
import { Button } from '../../components/ui/button.tsx'
import { Label } from '../../components/ui/label.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'

export const Route = createFileRoute('/_admin/admin/capsule-lab')({
  component: CapsuleLabPage,
})

const SPEEDS = ['0.1', '0.25', '0.5', '1'] as const
type Speed = (typeof SPEEDS)[number]

// Paliers annoncés par la capsule, dans l'ordre de `TeaseTier` (0 → 6).
const TIERS = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'brilliant',
  'legendary',
  'holographic',
] as const
type TierKey = (typeof TIERS)[number]

// Rejoue la séquence de la capsule (arrivée, charge, ouverture) sans tirer
// de carte, avec un ralenti sur toute la chorégraphie gsap.
function CapsuleLabPage() {
  const { t } = useTranslation(['admin', 'gacha'])
  const [kind, setKind] = useState<CapsuleKind>('astral')
  const [speed, setSpeed] = useState<Speed>('0.25')
  const [tier, setTier] = useState<TierKey>('legendary')
  const [run, setRun] = useState(0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AdminPageHeader
        icon={Sparkles}
        kicker={t('capsuleLab.kicker')}
        title={t('capsuleLab.title')}
        subtitle={t('capsuleLab.subtitle')}
        actions={
          <Button onClick={() => setRun((r) => r + 1)}>
            <RotateCcw className="h-4 w-4" />
            {t('capsuleLab.replay')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5">
          <Label>{t('capsuleLab.capsule')}</Label>
          <SegmentedControl<CapsuleKind>
            options={CAPSULE_KINDS.map((k) => ({
              value: k,
              label: t(`gacha:page.capsuleNames.${k}`),
            }))}
            value={kind}
            onChange={(k) => {
              setKind(k)
              setRun((r) => r + 1)
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('capsuleLab.speed')}</Label>
          <SegmentedControl<Speed>
            options={SPEEDS.map((s) => ({ value: s, label: `×${s}` }))}
            value={speed}
            onChange={setSpeed}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('capsuleLab.tier')}</Label>
          <SegmentedControl<TierKey>
            options={TIERS.map((k) => ({
              value: k,
              label: t(`capsuleLab.tiers.${k}`),
            }))}
            value={tier}
            onChange={(k) => {
              setTier(k)
              setRun((r) => r + 1)
            }}
            wrap
          />
        </div>
      </div>

      <div className="relative h-[520px] overflow-hidden rounded-2xl bg-black">
        <CapsuleStage
          key={`${kind}-${tier}-${run}`}
          capsuleKind={kind}
          teaseTier={TIERS.indexOf(tier) as TeaseTier}
          onBurst={() => undefined}
          timeScale={Number(speed)}
        />
      </div>
    </div>
  )
}
