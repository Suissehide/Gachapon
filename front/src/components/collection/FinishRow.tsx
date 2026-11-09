import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { CardVariant } from '../../api/collection.api.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { finishMultiplier } from '../../utils/cardStats.ts'
import { FINISH_ORDER } from './collectionEntries.ts'

const FINISH_BG: Record<CardVariant, string> = {
  NORMAL: 'var(--finish-normal)',
  BRILLIANT: 'var(--finish-brilliant)',
  HOLOGRAPHIC: 'var(--finish-holo)',
}

const FINISH_KEY: Record<CardVariant, string> = {
  NORMAL: 'normal',
  BRILLIANT: 'brilliant',
  HOLOGRAPHIC: 'holographic',
}

type Props = {
  finishes: CardVariant[]
  shown: CardVariant
  /** Absent : rangée en lecture seule (collection d'un autre joueur). */
  onPick?: (finish: CardVariant) => void
}

/**
 * Pastilles de vernis sous une tuile Rare+ : débloquée = cliquable pour
 * l'afficher, verrouillée = grisée avec un cadenas. La pastille de droite
 * donne le bonus de stats cumulé des vernis débloqués.
 */
export function FinishRow({ finishes, shown, onPick }: Props) {
  const { t } = useTranslation('collection')
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const bonusPct = Math.round(
    (finishMultiplier(finishes, economy.card) - 1) * 100,
  )

  return (
    <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
      <fieldset
        className="m-0 flex items-center gap-1.5 border-0 p-0"
        aria-label={t('collection:finish.groupLabel')}
      >
        {FINISH_ORDER.map((finish) => {
          const unlocked = finish === 'NORMAL' || finishes.includes(finish)
          const label = t(`collection:filters.variant.${FINISH_KEY[finish]}`)
          return (
            <button
              key={finish}
              type="button"
              aria-pressed={shown === finish}
              aria-label={label}
              aria-disabled={!unlocked || !onPick}
              onClick={() => unlocked && onPick?.(finish)}
              className={cn(
                'relative inline-flex h-5 w-5 items-center justify-center rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_0_0_1px_var(--border-dark)] transition-shadow duration-200 ease-out',
                unlocked &&
                  onPick &&
                  'cursor-pointer hover:shadow-[0_0_0_2px_var(--card),0_0_0_3px_color-mix(in_oklab,var(--text)_65%,transparent)]',
                !onPick && 'cursor-default',
                !unlocked && 'cursor-not-allowed opacity-40 grayscale',
                shown === finish &&
                  'shadow-[0_0_0_2px_var(--card),0_0_0_3px_color-mix(in_oklab,var(--text)_30%,transparent)]',
              )}
              style={{ background: FINISH_BG[finish] }}
            >
              {!unlocked && <Lock className="h-2.5 w-2.5 text-text" />}
            </button>
          )
        })}
      </fieldset>
      {bonusPct > 0 && (
        <span
          className="inline-flex h-5 items-center rounded-full px-2 font-mono text-[10px] font-extrabold leading-none text-text shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
          style={{
            background: finishes.includes('HOLOGRAPHIC')
              ? FINISH_BG.HOLOGRAPHIC
              : FINISH_BG.BRILLIANT,
          }}
        >
          {t('collection:finish.bonus', { pct: bonusPct })}
        </span>
      )}
    </div>
  )
}
