import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AlchemyTier } from '../../constants/alchemy.constant.ts'
import { cn } from '../../libs/utils.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { Button } from '../ui/button.tsx'
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-3.5 gap-y-[18px]">
          {tier.candidates.map((c) => {
            const mine = amounts[c.userCardId] ?? 0
            const canAdd = mine < c.available && picked < tier.cost
            return (
              <div key={c.userCardId} className="flex flex-col gap-2.5">
                <Button
                  type="button"
                  variant="none"
                  size="bare"
                  aria-label={t('alchemy:duplicates.add', { name: c.name })}
                  aria-disabled={!canAdd}
                  onClick={() => canAdd && onBump(c.userCardId, 1)}
                  className={cn(
                    'relative block w-full rounded-[10px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:bg-transparent',
                    !canAdd && 'cursor-default',
                    mine > 0 &&
                      'shadow-[0_0_0_3px_var(--background),0_0_0_6px_var(--primary),0_16px_30px_-12px_rgba(245,158,11,0.6)]',
                  )}
                >
                  <CardDisplay
                    compact
                    rarity={c.rarity}
                    name={c.name}
                    setName={c.setName}
                    imageUrl={c.imageUrl}
                    variant="NORMAL"
                    element={c.element}
                    level={c.level}
                  />
                  {mine > 0 && (
                    <span className="absolute -top-2 -right-2 z-[6] grid h-8 min-w-8 place-items-center rounded-full bg-primary px-[9px] font-display text-[15px] font-extrabold text-foreground shadow-[0_0_0_3px_var(--card),0_6px_14px_-4px_rgba(245,158,11,0.7)]">
                      {mine}
                    </span>
                  )}
                </Button>

                <div className="flex items-center justify-between gap-2">
                  <span className="whitespace-nowrap text-[13px] text-text-light">
                    {t('alchemy:duplicates.spare', { count: c.available })}
                  </span>
                  <div className="flex items-center gap-0.5 rounded-[11px] border border-border bg-surface-2 p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      disabled={mine === 0}
                      aria-label={t('alchemy:duplicates.remove', {
                        name: c.name,
                      })}
                      onClick={() => onBump(c.userCardId, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <b
                      className={cn(
                        'min-w-5 text-center font-display text-[15px] tabular-nums',
                        mine > 0 && 'text-primary-dark',
                      )}
                    >
                      {mine}
                    </b>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7"
                      disabled={!canAdd}
                      aria-label={t('alchemy:duplicates.add', {
                        name: c.name,
                      })}
                      onClick={() => onBump(c.userCardId, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
