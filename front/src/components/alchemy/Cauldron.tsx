import { Minus, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type {
  AlchemyStack,
  AlchemyTier,
} from '../../constants/alchemy.constant.ts'
import type { CardRarity } from '../../constants/card.constant.ts'
import { cn } from '../../libs/utils.ts'
import { CardLoadingFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'

// Littéraux complets : Tailwind ne voit pas les classes construites.
const SLOT_FRAME: Record<CardRarity, string> = {
  COMMON: 'border-rarity-common',
  UNCOMMON: 'border-rarity-uncommon',
  RARE: 'border-rarity-rare',
  EPIC: 'border-rarity-epic',
  LEGENDARY: 'border-rarity-legendary',
}

const RESULT_PANEL: Record<CardRarity, string> = {
  COMMON: 'bg-rarity-common/10 border-rarity-common/30',
  UNCOMMON: 'bg-rarity-uncommon/10 border-rarity-uncommon/30',
  RARE: 'bg-rarity-rare/10 border-rarity-rare/30',
  EPIC: 'bg-rarity-epic/10 border-rarity-epic/30',
  LEGENDARY: 'bg-rarity-legendary/10 border-rarity-legendary/30',
}

type Props = {
  tier: AlchemyTier
  amounts: Record<string, number>
  picked: number
  pending: boolean
  onBump: (userCardId: string, delta: number) => void
  onAuto: () => void
  onClear: () => void
  onTransmute: () => void
}

export function Cauldron({
  tier,
  amounts,
  picked,
  pending,
  onBump,
  onAuto,
  onClear,
  onTransmute,
}: Props) {
  const { t } = useTranslation(['alchemy', 'common'])
  const full = picked === tier.cost
  const spare = tier.candidates.reduce((s, c) => s + c.available, 0)
  const missing = Math.max(0, tier.cost - spare)
  // Un emplacement par exemplaire choisi, dans l'ordre de la liste.
  const filled: AlchemyStack[] = tier.candidates.flatMap((c) =>
    Array<AlchemyStack>(amounts[c.userCardId] ?? 0).fill(c),
  )
  // 6 ou 8 emplacements : deux rangées plutôt qu'une ligne qui déborde.
  const columns = tier.cost <= 5 ? tier.cost : Math.ceil(tier.cost / 2)

  return (
    <Card className="flex flex-col gap-[18px] rounded-[22px] p-[22px]">
      <h2 className="flex items-baseline justify-between font-display text-[22px] font-extrabold tracking-[-0.01em] text-text">
        {t('alchemy:cauldron.title')}
        <span
          className={cn(
            'font-mono text-sm font-bold text-text-light',
            full && 'text-success-ink',
          )}
        >
          {t('alchemy:cauldron.progress', { picked, cost: tier.cost })}
        </span>
      </h2>

      <div
        className="grid justify-center gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 60px))` }}
      >
        {Array.from({ length: tier.cost }, (_, k) => {
          const c = filled[k]
          return c ? (
            <Button
              // biome-ignore lint/suspicious/noArrayIndexKey: emplacements fixes, l'index EST l'emplacement
              key={k}
              type="button"
              variant="none"
              size="bare"
              aria-label={t('alchemy:cauldron.removeSlot', { name: c.name })}
              title={t('alchemy:cauldron.removeSlot', { name: c.name })}
              onClick={() => onBump(c.userCardId, -1)}
              className={cn(
                'group relative aspect-[2/3] w-full overflow-hidden rounded-lg border-2 bg-surface-3',
                SLOT_FRAME[c.rarity],
              )}
            >
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute inset-0 grid place-items-center bg-danger-ink/70 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <Minus className="h-6 w-6" />
              </span>
            </Button>
          ) : (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: emplacements fixes, l'index EST l'emplacement
              key={k}
              className="aspect-[2/3] w-full rounded-lg border-[1.5px] border-dashed border-foreground/16 bg-foreground/[0.02]"
            />
          )
        })}
      </div>

      <div className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/35 before:h-px before:flex-1 before:bg-foreground/10 after:h-px after:flex-1 after:bg-foreground/10">
        {t('alchemy:cauldron.yields')}
      </div>

      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl border p-3.5 transition-opacity',
          RESULT_PANEL[tier.toRarity],
          !full && 'opacity-50',
        )}
      >
        <div className="relative aspect-[2/3] w-[72px] shrink-0">
          <CardLoadingFace compact rarity={tier.toRarity} />
        </div>
        <div>
          <b className="block text-base text-text">
            {t('alchemy:cauldron.resultTitle', {
              rarity: t(`common:rarity.${tier.toRarity.toLowerCase()}`),
            })}
          </b>
          <small className="text-[13px] text-text-light">
            {t('alchemy:cauldron.resultSubtitle')}
          </small>
        </div>
      </div>

      {missing > 0 && (
        <p className="text-center text-sm font-semibold text-danger-ink">
          {t('alchemy:cauldron.missing', { count: missing })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="amberSoft"
            className="h-12 flex-1 rounded-[14px] text-[15px]"
            disabled={tier.suggestedPicks === null}
            onClick={onAuto}
          >
            <WandSparkles className="h-[18px] w-[18px]" />
            {t('alchemy:cauldron.auto')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-[14px] px-4 text-[15px] font-bold text-text-light hover:text-text"
            disabled={picked === 0}
            onClick={onClear}
          >
            {t('alchemy:cauldron.clear')}
          </Button>
        </div>
        <Button
          type="button"
          variant="amber"
          className="h-[54px] w-full flex-none rounded-[14px] text-[17px] text-foreground"
          disabled={!full || pending}
          onClick={onTransmute}
        >
          {t('alchemy:cauldron.transmute')}
        </Button>
      </div>

      <p className="text-center text-[13px] text-text-light">
        {t('alchemy:cauldron.lastCopyNote')}
      </p>
    </Card>
  )
}
