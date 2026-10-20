import { useNavigate } from '@tanstack/react-router'
import { Check, Clock, Gift, Sparkles } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useTranslation } from 'react-i18next'

import type { WandererView } from '../../api/campaign.api.ts'
import type { TeamUnit } from '../../api/combat.api.ts'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'
import { BattlePrepModal, RewardPill } from '../battle/BattlePrepModal.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'

/**
 * Fenêtre avant-combat du monstre errant : la même que celle d'une étape de
 * campagne (`BattlePrepModal`), sans coût d'énergie et avec un butin
 * surprise. Le combat et le butin vivent sur l'écran de combat
 * (`search: { wanderer: true }`).
 */
export function WandererModal({
  wanderer,
  open,
  onOpenChange,
  team,
  onEditTeam,
}: {
  wanderer: WandererView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamUnit[]
  onEditTeam: () => void
}) {
  const { t } = useTranslation(['wanderer', 'combat'])
  const navigate = useNavigate()

  if (!wanderer) {
    return null
  }

  const countdown = formatWandererCountdown(
    new Date(wanderer.expiresAt).getTime() - Date.now(),
  )
  const hasTeam = team.length > 0

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent
        size="lg"
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-[#fbf8f3] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]"
      >
        <Dialog.Title className="sr-only">{wanderer.name}</Dialog.Title>
        <BattlePrepModal
          eyebrow={t('wanderer:eyebrowStage', { stage: wanderer.stageLabel })}
          headerAside={
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-text-light/70">
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          }
          enemies={[
            {
              id: wanderer.stageId,
              imageUrl: wanderer.imageUrl,
              power: wanderer.recommendedPower,
              element: wanderer.element,
            },
          ]}
          enemiesLabel={wanderer.name}
          isBoss
          recommendedPower={wanderer.recommendedPower}
          team={team}
          currentPC={0}
          energyCost={0}
          hideEnergy
          rewards={
            <>
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                <Sparkles className="h-3 w-3 text-amber-600" />
                {t('combat:campaign.rewardsLabel')}
              </div>
              <div className="flex flex-wrap gap-2">
                <RewardPill
                  color="#8b5cf6"
                  label={t('wanderer:levelCard.surpriseLoot')}
                  icon={Gift}
                />
              </div>
              <ul className="mt-3.5 space-y-1.5 border-t border-[rgba(27,23,38,0.07)] pt-3.5 text-[13px] text-text">
                {(['pre.freeNoEnergy', 'pre.unlimitedAttempts'] as const).map(
                  (key) => (
                    <li key={key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {t(`wanderer:${key}`)}
                    </li>
                  ),
                )}
              </ul>
            </>
          }
          fightLabel={
            hasTeam
              ? t('combat:campaign.fight')
              : t('combat:battlePrep.reason.teamRequired')
          }
          fightVariant="violet"
          canFight={hasTeam}
          onFight={() =>
            navigate({
              to: '/battle/$stageId',
              params: { stageId: wanderer.stageId },
              search: { wanderer: true },
            })
          }
          onEditTeam={onEditTeam}
          onClose={() => onOpenChange(false)}
        />
      </PopupContent>
    </Popup>
  )
}
