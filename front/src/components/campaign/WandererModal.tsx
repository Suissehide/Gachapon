import { useNavigate } from '@tanstack/react-router'
import { Gift, Swords } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'

import type { WandererView } from '../../api/campaign.api.ts'
import placeholderImg from '../../assets/data/not-found.png'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'

/**
 * Fenêtre avant-combat du monstre errant (phase "pre" de la maquette — les
 * phases de combat et de résultat vivent sur l'écran de combat existant,
 * voir `search: { wanderer: true }`). `Dialog.Title` est utilisé directement
 * (pas `PopupTitle`, qui aligne son contenu à gauche) pour un titre centré,
 * comme `ReturnBonusPopup`.
 */
export function WandererModal({
  wanderer,
  open,
  onOpenChange,
}: {
  wanderer: WandererView | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('wanderer')
  const navigate = useNavigate()
  const locale = currentLocale()

  if (!wanderer) {
    return null
  }

  const countdown = formatWandererCountdown(
    new Date(wanderer.expiresAt).getTime() - Date.now(),
  )

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent className="rounded-[28px] border-0 bg-card text-center shadow-[0_40px_80px_-30px_rgba(124,58,237,0.45)]">
        <div className="relative px-7 pt-[30px] pb-[26px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--currency-energy)_16%,transparent),transparent_70%)]"
          />
          <div className="relative font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-currency-energy-ink">
            {t('eyebrowStage', { stage: wanderer.stageLabel })}
          </div>
          <Dialog.Title className="relative mt-1.5 mb-4 font-display text-[28px] font-extrabold tracking-[-0.02em] text-text">
            {wanderer.name}
          </Dialog.Title>
          <div className="relative mx-auto mb-4 h-[240px] w-fit overflow-hidden rounded-2xl bg-text p-[5px] shadow-[0_0_0_2px_var(--currency-energy)]">
            <img
              src={wanderer.imageUrl ?? placeholderImg}
              alt=""
              className="h-full w-auto rounded-[11px] object-cover"
              style={{ aspectRatio: '300 / 420' }}
            />
          </div>
          <div className="relative mb-4 grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background px-1.5 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                {t('pre.cost')}
              </span>
              <b className="text-[16px] text-emerald-700">{t('pre.free')}</b>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background px-1.5 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                {t('pre.power')}
              </span>
              <b className="text-[16px] text-text">
                {formatNumber(wanderer.recommendedPower, locale)}
              </b>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background px-1.5 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                {t('pre.loot')}
              </span>
              <b className="flex items-center justify-center gap-1 text-[16px] text-currency-energy-ink">
                <Gift className="h-4 w-4" />
                {t('pre.surprise')}
              </b>
            </div>
          </div>
          <Button
            className="relative h-14 w-full rounded-2xl bg-currency-energy text-[17px] font-extrabold text-white shadow-[0_3px_0_var(--currency-energy-ink)] hover:bg-currency-energy/90 active:translate-y-0.5"
            onClick={() =>
              navigate({
                to: '/battle/$stageId',
                params: { stageId: wanderer.stageId },
                search: { wanderer: true },
              })
            }
          >
            <Swords className="h-[18px] w-[18px]" />
            {t('pre.fight')}
          </Button>
          <p className="relative mt-2.5 text-[13px] text-text-light/70">
            {t('pre.note', { time: countdown })}
          </p>
        </div>
      </PopupContent>
    </Popup>
  )
}
