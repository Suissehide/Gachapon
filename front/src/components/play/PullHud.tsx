import { Gem, Zap } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

import type { ShopItem } from '../../constants/shop.constant.ts'
import { pityProgress } from './PityCard.tsx'

// Garantie + boosts actifs, affichés par-dessus le tirage (fond noir). Les
// valeurs suivent les cartes retournées — c'est play.tsx qui les calcule.
export function PullHud({
  pity,
  threshold,
  boosts,
}: {
  pity: number
  threshold: number
  boosts: ShopItem[]
}) {
  const { t } = useTranslation('gacha')
  const { remaining, pct } = pityProgress(pity, threshold)

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-[60] flex w-[min(15rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-2xl border border-white/15 bg-black/50 px-3.5 py-3 text-white backdrop-blur animate-in fade-in-0 duration-500">
      {threshold > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-white/70">
            <Gem className="h-3.5 w-3.5 shrink-0 text-secondary" />
            {remaining === 1 ? (
              <b className="text-secondary">{t('gacha:cards.pityNext')}</b>
            ) : (
              <span>
                <Trans
                  t={t}
                  i18nKey="gacha:cards.pityIn"
                  count={remaining}
                  components={{
                    count: <b className="tabular-nums text-white" />,
                  }}
                />
              </span>
            )}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                background:
                  'linear-gradient(90deg, var(--secondary), var(--rarity-legendary))',
              }}
            />
          </div>
        </div>
      )}
      {boosts.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-1.5 text-[12px] leading-tight"
        >
          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="flex-1 truncate text-white/80">{item.name}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/60">
            {t('gacha:cards.boostPulls', {
              count: item.activeBoost?.pullsRemaining ?? 0,
            })}
          </span>
        </div>
      ))}
    </div>
  )
}
