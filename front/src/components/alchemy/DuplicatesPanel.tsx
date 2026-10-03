import { useTranslation } from 'react-i18next'

import type { AlchemyTier } from '../../constants/alchemy.constant.ts'
import {
  SelectableCardGrid,
  SelectableDuplicateCard,
} from '../shared/SelectableDuplicateCard.tsx'
import { Card } from '../ui/card.tsx'

type Props = {
  tier: AlchemyTier
  amounts: Record<string, number>
  picked: number
  onBump: (userCardId: string, delta: number) => void
}

export function DuplicatesPanel({ tier, amounts, picked, onBump }: Props) {
  const { t } = useTranslation(['alchemy', 'common'])
  const spare = tier.candidates.reduce((s, c) => s + c.available, 0)

  return (
    <Card className="rounded-[22px] p-[22px]">
      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] font-extrabold tracking-[-0.01em] text-text">
          {t('alchemy:duplicates.title')}
        </h2>
        <span className="text-sm text-text-light">
          {t('alchemy:duplicates.count', { count: spare })}
          {' · '}
          {t('alchemy:tier.possible', { count: tier.maxTransmutations })}
        </span>
      </div>

      {tier.candidates.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-border-dark px-6 py-12 text-center">
          <p className="font-display text-lg font-extrabold text-text">
            {t('alchemy:duplicates.emptyTitle', {
              rarity: t(`common:rarity.${tier.fromRarity.toLowerCase()}`),
            })}
          </p>
          <p className="text-sm text-text-light">
            {t('alchemy:duplicates.emptyHint')}
          </p>
        </div>
      ) : (
        <SelectableCardGrid>
          {tier.candidates.map((c) => {
            const mine = amounts[c.userCardId] ?? 0
            return (
              <SelectableDuplicateCard
                key={c.userCardId}
                card={c}
                selected={mine}
                canAdd={mine < c.available && picked < tier.cost}
                onAdd={() => onBump(c.userCardId, 1)}
                onRemove={() => onBump(c.userCardId, -1)}
                labels={{
                  spare: t('alchemy:duplicates.spare', { count: c.available }),
                  add: t('alchemy:duplicates.add', { name: c.name }),
                  remove: t('alchemy:duplicates.remove', { name: c.name }),
                }}
              />
            )
          })}
        </SelectableCardGrid>
      )}
    </Card>
  )
}
