import { Clock, Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { WandererView } from '../../api/campaign.api.ts'
import placeholderImg from '../../assets/data/not-found.png'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'

/**
 * Case violette qui prend la place de la `LevelCard` de l'étage visité par
 * le monstre errant — même taille dans la grille. Toute la case est
 * cliquable (maquette `wanderer.jsx`/`wanderer.css`, statique).
 */
export function WandererLevelCard({
  wanderer,
  onOpen,
}: {
  wanderer: WandererView
  onOpen: () => void
}) {
  const { t } = useTranslation('wanderer')
  const countdown = formatWandererCountdown(
    new Date(wanderer.expiresAt).getTime() - Date.now(),
  )

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('levelCard.ariaLabel', { stage: wanderer.stageLabel })}
      className="group relative flex min-h-[92px] flex-col gap-3 rounded-2xl border-[1.5px] border-currency-energy/50 bg-gradient-to-br from-currency-energy/10 to-white p-3.5 text-left shadow-[0_14px_28px_-16px_rgba(124,58,237,0.45)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2">
        <span className="font-display text-[17px] font-extrabold text-text">
          {wanderer.stageLabel}
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-currency-energy-ink">
          {t('levelCard.eyebrow')}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-text-light/70">
          <Clock className="h-3 w-3" />
          {countdown}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="relative shrink-0 overflow-hidden rounded-[10px] bg-text p-[3px] shadow-[0_0_0_1.5px_var(--currency-energy)]">
          <img
            src={wanderer.imageUrl ?? placeholderImg}
            alt=""
            className="h-[84px] w-auto rounded-[8px] object-cover"
            style={{ aspectRatio: '300 / 420' }}
          />
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-currency-energy ring-2 ring-card"
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate font-display text-[18px] text-text">
            {wanderer.name}
          </b>
          {/* Pas de `truncate` : la maquette exige la ligne complète
              « Gratuit · Butin surprise » — une carte étroite (grille à 3
              colonnes) la coupait sinon avant « Butin surprise ». */}
          <span className="text-[13px] font-semibold leading-snug text-currency-energy-ink">
            <span className="text-emerald-700">{t('levelCard.free')}</span>
            {' · '}
            {t('levelCard.surpriseLoot')}
          </span>
        </div>
      </div>
      <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-currency-energy px-3.5 font-display text-[14.5px] font-bold text-white shadow-[0_3px_0_var(--currency-energy-ink)]">
        <Swords className="h-4 w-4" />
        {t('levelCard.fight')}
      </span>
    </button>
  )
}
