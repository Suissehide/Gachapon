import { Swords } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { TeamMember } from '../../api/teams.api.ts'
import type { DuelView } from '../../api/wagers.api.ts'
import { busyUserIds } from '../../libs/duel.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useProposeDuel } from '../../queries/useWagers.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'
import { Select } from '../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  members: TeamMember[]
  /** Duels non réglés de l'équipe — sert à écarter les joueurs déjà pris. */
  duels: DuelView[]
}

export function DuelProposePopup({
  open,
  onOpenChange,
  teamId,
  members,
  duels,
}: Props) {
  const { t } = useTranslation('wagers')
  const [opponentId, setOpponentId] = useState('')
  const { mutate: propose, isPending } = useProposeDuel(teamId)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  // `undefined` tant que le profil n'est pas chargé : on ne se rabat PAS sur
  // une chaîne vide, qui ne filtrerait personne et me proposerait moi-même
  // comme adversaire. Sans identifiant, pas de liste.
  const myUserId = useAuthStore((s) => s.user?.id)
  const pullCount = economy.duel.pullCount

  const busy = busyUserIds(duels)
  const options =
    myUserId === undefined
      ? []
      : members
          .filter((m) => m.userId !== myUserId && !busy.has(m.userId))
          .map((m) => ({ value: m.userId, label: m.user.username }))

  const submit = () => {
    if (opponentId === '') {
      return
    }
    propose(opponentId, {
      onSuccess: () => {
        setOpponentId('')
        onOpenChange(false)
      },
    })
  }

  // Le libellé porte la raison, pas seulement l'info-bulle : sur écran
  // tactile il n'y a pas de survol pour révéler un `title`.
  const submitLabel = isPending
    ? t('duelPropose.submitSending')
    : opponentId === ''
      ? t('duelPropose.submitChooseOpponent')
      : t('duelPropose.submit')

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<Swords className="h-4 w-4" />}
            subtitle={t('duelPropose.subtitle')}
          >
            {t('duelPropose.title')}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              {t('duelPropose.opponentLabel')}
            </span>
            {options.length === 0 ? (
              <p className="text-sm text-text-light">
                {t('duelPropose.noTeammates')}
              </p>
            ) : (
              <Select
                id="duel-opponent"
                options={options}
                value={opponentId}
                onValueChange={setOpponentId}
                placeholder={t('duelPropose.chooseOpponent')}
                clearable={false}
              />
            )}
          </div>

          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm text-text-light">
            <li>
              <Trans
                t={t}
                i18nKey="duelPropose.ruleCounts"
                values={{ pullCount }}
                components={{ strong: <strong className="text-text" /> }}
              />
            </li>
            <li>{t('duelPropose.ruleScoring')}</li>
            <li>{t('duelPropose.ruleLocked')}</li>
            <li>{t('duelPropose.ruleTie')}</li>
          </ul>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={opponentId === '' || isPending}
            title={submitLabel}
          >
            <Swords className="h-4 w-4" />
            {submitLabel}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
