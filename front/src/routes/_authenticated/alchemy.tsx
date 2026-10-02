import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Cauldron } from '../../components/alchemy/Cauldron.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { AlchemyFromRarity } from '../../constants/alchemy.constant.ts'
import { useAlchemy } from '../../queries/useAlchemy.ts'

export const Route = createFileRoute('/_authenticated/alchemy')({
  component: AlchemyPage,
})

function AlchemyPage() {
  const { t } = useTranslation(['alchemy', 'common'])
  const { data } = useAlchemy()
  const [selected, setSelected] = useState<AlchemyFromRarity | null>(null)

  const tiers = data?.tiers ?? []
  const defaultTier =
    tiers.find((tier) => tier.maxTransmutations > 0) ?? tiers[0]
  const activeFromRarity = selected ?? defaultTier?.fromRarity
  const activeTier =
    tiers.find((tier) => tier.fromRarity === activeFromRarity) ?? defaultTier

  return (
    <PageShell>
      <PageHeader
        eyebrow={t('alchemy:page.eyebrow')}
        title={t('alchemy:page.title')}
        subtitle={t('alchemy:page.subtitle')}
      />

      {activeTier && (
        <>
          <SegmentedControl
            options={tiers.map((tier) => ({
              value: tier.fromRarity,
              label: t('alchemy:tier.label', {
                from: t(`common:rarity.${tier.fromRarity.toLowerCase()}`),
                to: t(`common:rarity.${tier.toRarity.toLowerCase()}`),
              }),
            }))}
            value={activeTier.fromRarity}
            onChange={setSelected}
          />
          <p className="text-sm text-text-light">
            {t('alchemy:tier.recipe', { cost: activeTier.cost })}
            {' · '}
            {t('alchemy:tier.possible', {
              count: activeTier.maxTransmutations,
            })}
          </p>

          <Cauldron
            tier={activeTier}
            // Change de cran → reset. Après une transmutation réussie sur le
            // même cran, le serveur renvoie de nouvelles suggestions (les
            // quantités ont bougé) : il faut aussi remonter dans ce cas,
            // sinon `amounts` garde des quantités qui dépassent le nouveau
            // disponible.
            key={`${activeTier.fromRarity}:${(activeTier.suggestedPicks ?? [])
              .map((p) => `${p.userCardId}:${p.amount}`)
              .join(',')}`}
          />
        </>
      )}
    </PageShell>
  )
}
