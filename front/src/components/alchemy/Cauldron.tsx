import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  AlchemyPick,
  AlchemyTier,
} from '../../constants/alchemy.constant.ts'
import type { CardRarity } from '../../constants/card.constant.ts'
import { cn } from '../../libs/utils.ts'
import { useTransmute } from '../../queries/useAlchemy.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'

// Littéraux complets : Tailwind ne voit pas les classes construites.
const RARITY_DOT: Record<CardRarity, string> = {
  COMMON: 'bg-rarity-common',
  UNCOMMON: 'bg-rarity-uncommon',
  RARE: 'bg-rarity-rare',
  EPIC: 'bg-rarity-epic',
  LEGENDARY: 'bg-rarity-legendary',
}

type Props = { tier: AlchemyTier }

export function Cauldron({ tier }: Props) {
  const { t } = useTranslation(['alchemy', 'common'])
  const transmute = useTransmute()
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (tier.suggestedPicks ?? []).map((p) => [p.userCardId, p.amount]),
    ),
  )

  const picked = Object.values(amounts).reduce((s, n) => s + n, 0)

  const bump = (userCardId: string, delta: number) =>
    setAmounts((prev) => ({
      ...prev,
      [userCardId]: Math.max(0, (prev[userCardId] ?? 0) + delta),
    }))

  const submit = () => {
    const picks: AlchemyPick[] = Object.entries(amounts)
      .filter(([, amount]) => amount > 0)
      .map(([userCardId, amount]) => ({ userCardId, amount }))
    transmute.mutate({ fromRarity: tier.fromRarity, picks })
  }

  if (tier.candidates.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-light">{t('alchemy:cauldron.empty')}</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-extrabold text-text">
        {t('alchemy:cauldron.title')}
      </h2>

      <div className="flex flex-col gap-2">
        {tier.candidates.map((c) => {
          const mine = amounts[c.userCardId] ?? 0
          const canAdd = mine < c.available && picked < tier.cost
          return (
            <div
              key={c.userCardId}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-2"
            >
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {c.name}
                </p>
                <p className="text-xs text-text-light">
                  {t('alchemy:cauldron.available', { count: c.available })}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                disabled={mine === 0}
                onClick={() => bump(c.userCardId, -1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">
                {mine}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                disabled={!canAdd}
                onClick={() => bump(c.userCardId, 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
        <div className="flex items-center gap-2">
          <i
            aria-hidden
            className={cn(
              'h-2.5 w-2.5 rounded-[3px]',
              RARITY_DOT[tier.toRarity],
            )}
          />
          <span className="text-sm font-semibold text-text">
            {t('alchemy:cauldron.progress', { picked, cost: tier.cost })}
          </span>
        </div>
        <p className="text-xs text-text-light">
          {t('alchemy:cauldron.lastCopyNote')}
        </p>
        <Button
          variant="amber"
          disabled={picked !== tier.cost || transmute.isPending}
          onClick={submit}
        >
          {t('alchemy:cauldron.transmute')}
        </Button>
      </div>
    </Card>
  )
}
