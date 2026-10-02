import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Cauldron } from '../../components/alchemy/Cauldron.tsx'
import { DuplicatesPanel } from '../../components/alchemy/DuplicatesPanel.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import {
  ALCHEMY_RARITY_BG,
  type AlchemyFromRarity,
  type AlchemyPick,
  type AlchemyTier,
} from '../../constants/alchemy.constant.ts'
import { cn } from '../../libs/utils.ts'
import { useAlchemy, useTransmute } from '../../queries/useAlchemy.ts'

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
  // Cran figé dès la première réponse : sinon, épuiser le cran choisi par
  // défaut ferait sauter la sélection vers un autre au refetch suivant.
  if (selected === null && defaultTier) {
    setSelected(defaultTier.fromRarity)
  }
  const activeFromRarity = selected ?? defaultTier?.fromRarity
  const activeTier =
    tiers.find((tier) => tier.fromRarity === activeFromRarity) ?? defaultTier

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow={t('alchemy:page.eyebrow')}
        title={t('alchemy:page.title')}
        subtitle={t('alchemy:page.subtitle')}
      />

      {activeTier && (
        <>
          <SegmentedControl
            wrap
            className="w-fit max-w-full gap-1.5 rounded-2xl bg-card/70 p-[5px]"
            optionClassName="group h-[42px] gap-2 rounded-xl px-3.5 text-[15px] font-bold aria-pressed:border-transparent aria-pressed:bg-card aria-pressed:shadow-[0_1px_0_rgba(27,23,38,0.05),0_6px_16px_-8px_rgba(27,23,38,0.2)]"
            options={tiers.map((tier) => ({
              value: tier.fromRarity,
              label: (
                <>
                  <i
                    aria-hidden
                    className={cn(
                      'h-2.5 w-2.5 rounded-[3px]',
                      ALCHEMY_RARITY_BG[tier.fromRarity],
                    )}
                  />
                  {t(`common:rarity.${tier.fromRarity.toLowerCase()}`)}
                  <span className="font-medium opacity-50">→</span>
                  {t(`common:rarity.${tier.toRarity.toLowerCase()}`)}
                  <span className="h-[22px] min-w-[22px] rounded-full bg-foreground/7 px-1.5 text-center font-mono text-xs leading-[22px] group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary-darker">
                    {tier.maxTransmutations}
                  </span>
                </>
              ),
            }))}
            value={activeTier.fromRarity}
            onChange={setSelected}
          />

          <Workbench
            tier={activeTier}
            // Change de cran ou de stock (transmutation réussie, carte sortie
            // des candidats) → reset : `amounts` ne doit jamais garder des
            // quantités qui dépassent le nouveau disponible.
            key={`${activeTier.fromRarity}:${activeTier.candidates
              .map((c) => `${c.userCardId}:${c.available}`)
              .join(',')}`}
          />
        </>
      )}
    </PageShell>
  )
}

/** Sélection partagée entre la liste des doublons et le chaudron ; démarre vide. */
function Workbench({ tier }: { tier: AlchemyTier }) {
  const transmute = useTransmute()
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  // Seules les piles encore candidates comptent : une carte sortie du cran
  // (duel, plus de doublon) ne doit ni gonfler le total ni partir au serveur.
  const picks: AlchemyPick[] = tier.candidates
    .map((c) => ({
      userCardId: c.userCardId,
      amount: amounts[c.userCardId] ?? 0,
    }))
    .filter((p) => p.amount > 0)
  const picked = picks.reduce((s, p) => s + p.amount, 0)

  const bump = (userCardId: string, delta: number) =>
    setAmounts((prev) => ({
      ...prev,
      [userCardId]: Math.max(0, (prev[userCardId] ?? 0) + delta),
    }))

  return (
    <div className="grid items-start gap-6 min-[960px]:grid-cols-[minmax(0,1fr)_380px]">
      <DuplicatesPanel
        tier={tier}
        amounts={amounts}
        picked={picked}
        onBump={bump}
      />
      <div className="order-first min-[960px]:sticky min-[960px]:top-[calc(var(--topbar-h)+24px)] min-[960px]:order-none">
        <Cauldron
          tier={tier}
          amounts={amounts}
          picked={picked}
          pending={transmute.isPending}
          onBump={bump}
          onAuto={() =>
            setAmounts(
              Object.fromEntries(
                (tier.suggestedPicks ?? []).map((p) => [
                  p.userCardId,
                  p.amount,
                ]),
              ),
            )
          }
          onClear={() => setAmounts({})}
          onTransmute={() =>
            transmute.mutate({ fromRarity: tier.fromRarity, picks })
          }
        />
      </div>
    </div>
  )
}
