import { Swords } from 'lucide-react'
import { useState } from 'react'

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
    ? 'Envoi en cours…'
    : opponentId === ''
      ? 'Choisis un adversaire'
      : 'Envoyer le défi'

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<Swords className="h-4 w-4" />}
            subtitle="Mise tes prochains tirages contre un coéquipier"
          >
            Défier un coéquipier
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Adversaire
            </span>
            {options.length === 0 ? (
              <p className="text-sm text-text-light">
                Aucun coéquipier disponible : ils sont tous déjà en duel, ou tu
                es seul dans cette équipe.
              </p>
            ) : (
              <Select
                id="duel-opponent"
                options={options}
                value={opponentId}
                onValueChange={setOpponentId}
                placeholder="Choisis un adversaire"
                clearable={false}
              />
            )}
          </div>

          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm text-text-light">
            <li>
              Vos <strong className="text-text">{pullCount}</strong> prochains
              tirages comptent, chacun de votre côté.
            </li>
            <li>
              Le meilleur score l'emporte et rafle les cartes tirées par
              l'autre. Le barème est celui du classement : plus la rareté est
              haute, plus la carte vaut, et une brillante compte une fois et
              demie.
            </li>
            <li>
              Tant que le duel dure, les cartes comptées ne peuvent plus être
              recyclées ni transformées en poussière.
            </li>
            <li>
              En cas d'égalité, chacun garde ses cartes. Si l'un traîne, le duel
              se règle à son échéance et les tirages manquants valent zéro.
            </li>
          </ul>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
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
