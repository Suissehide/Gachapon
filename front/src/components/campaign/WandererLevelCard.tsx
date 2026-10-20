import { ArrowRight, Clock, Gift, Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { WandererView } from '../../api/campaign.api.ts'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'
import { EnemyCard } from '../battle/BattlePrepModal.tsx'
import { buttonVariants } from '../ui/button.tsx'

/**
 * Case violette qui prend la place de la `LevelCard` de l'étage visité par
 * le monstre errant — même taille dans la grille, même « Combattre ». Toute
 * la case est cliquable.
 */
export function WandererLevelCard({
  wanderer,
  onOpen,
}: {
  wanderer: WandererView
  onOpen: () => void
}) {
  const { t } = useTranslation(['wanderer', 'combat'])
  const countdown = formatWandererCountdown(
    new Date(wanderer.expiresAt).getTime() - Date.now(),
  )

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('wanderer:levelCard.ariaLabel', {
        stage: wanderer.stageLabel,
      })}
      className="group relative isolate flex min-h-[92px] cursor-pointer flex-col gap-3 rounded-2xl border-[1.5px] border-accent/70 animate-[wandererDrift_6s_ease-in-out_infinite] bg-linear-150 from-currency-energy/8 to-card to-75% bg-size-[200%_200%] p-4 text-left shadow-[0_14px_28px_-16px_color-mix(in_srgb,var(--currency-energy)_55%,transparent)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_20px_34px_-16px_color-mix(in_srgb,var(--currency-energy)_70%,transparent)]"
    >
      {/* Aura violette derrière la case, à sa forme (4 px de débord) : ses
          couleurs glissent lentement (wandererDrift) et elle respire comme
          l'aura des cartes chromatiques (cardAuraPulse). */}
      <span
        aria-hidden
        className="absolute -inset-1 -z-10 animate-[wandererDrift_6s_ease-in-out_infinite,cardAuraPulse_3.4s_ease-in-out_infinite] rounded-[20px] bg-linear-135 from-accent via-currency-energy to-secondary bg-size-[200%_200%] blur-[6px] [--aura-halo-opacity:0.5]"
      />
      <div className="flex items-center gap-2">
        <span className="font-display text-[17px] font-extrabold text-text">
          {wanderer.stageLabel}
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-currency-energy-ink">
          {t('wanderer:levelCard.eyebrow')}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-text-light/70">
          <Clock className="h-3 w-3" />
          {countdown}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <EnemyCard
          boss
          power={wanderer.recommendedPower}
          width="w-[64px] shrink-0"
          imageUrl={wanderer.imageUrl}
          element={wanderer.element}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate font-display text-[18px] text-text">
            {wanderer.name}
          </b>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-currency-energy-ink">
            <Gift className="h-3.5 w-3.5" />
            {t('wanderer:levelCard.surpriseLoot')}
          </span>
        </div>
      </div>
      <span
        className={buttonVariants({
          variant: 'violet',
          size: 'lg',
          className: 'w-full gap-2',
        })}
      >
        <Swords className="h-4 w-4" />
        {t('combat:campaign.fight')}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
