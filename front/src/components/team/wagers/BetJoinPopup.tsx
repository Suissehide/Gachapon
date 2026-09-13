// Renchérir sur un marché ouvert : on a déjà choisi son camp en cliquant, il
// ne reste que la mise.
//
// La cote affichée est CELLE DU MOMENT et elle bougera encore : chaque mise
// qui arrive après la nôtre déplace le partage du pot. L'écran le dit en
// toutes lettres — un joueur qui croirait à un prix ferme se sentirait volé
// au règlement, alors que c'est le principe même d'un pot commun.
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { BetSide, BetView } from '../../../api/wagers.api.ts'
import { fmtMultiplier } from '../../../libs/duel.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../../queries/useEconomyConfig.ts'
import { useJoinBet } from '../../../queries/useWagers.ts'
import { Button } from '../../ui/button.tsx'
import { Input } from '../../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'

const fr = (n: number) => n.toLocaleString('fr-FR')

export function BetJoinPopup({
  teamId,
  target,
  onClose,
}: {
  teamId: string
  /** Le marché et le camp visé ; `null` ferme la fenêtre. */
  target: { bet: BetView; side: BetSide } | null
  onClose: () => void
}) {
  const [stakeInput, setStakeInput] = useState('')
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { minStake, maxStake } = economy.bet
  const { mutate: join, isPending } = useJoinBet(teamId)

  // Remise à zéro à chaque ouverture : une mise tapée puis abandonnée ne doit
  // pas réapparaître sur le marché suivant.
  useEffect(() => {
    if (target !== null) {
      setStakeInput('')
    }
  }, [target])

  const stake = Number(stakeInput)
  const stakeValid =
    stakeInput !== '' &&
    Number.isInteger(stake) &&
    stake >= minStake &&
    stake <= maxStake

  if (target === null) {
    return null
  }

  const { bet, side } = target
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  const odds = side === 'YES' ? bet.oddsYes : bet.oddsNo

  const submit = () => {
    if (!stakeValid) {
      return
    }
    join({ betId: bet.id, side, stake }, { onSuccess: () => onClose() })
  }

  return (
    <Popup open onOpenChange={(open) => !open && onClose()}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<Sparkles className="h-4 w-4" />}
            subtitle={`${bet.target.username} sortira-t-il au moins ${rarityLabel} sur ses ${bet.pullWindow} prochains tirages ?`}
          >
            {side === 'YES' ? 'Oui, il y arrivera' : 'Non, il échouera'}
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-light">
              Cote actuelle de ce camp
            </span>
            <span className="font-display text-xl font-extrabold tabular-nums text-text">
              ×{fmtMultiplier(odds)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Mise
            </span>
            <Input
              type="number"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder={`Entre ${minStake} et ${maxStake} poussière`}
            />
            {stakeValid && (
              <span className="inline-flex items-center gap-1.5 text-xs text-text-light">
                <Sparkles className="h-3.5 w-3.5 text-dust" />
                Gain à la cote actuelle : {fr(Math.round(stake * odds))}
              </span>
            )}
          </div>

          <p className="text-sm text-text-light">
            Cette cote n’est pas figée : chaque mise qui arrivera après la
            tienne déplacera le partage du pot, dans un sens comme dans l’autre.
            Elle ne peut pas descendre sous la cote calculée sur les vraies
            chances de {bet.target.username} — c’est un plancher.
          </p>
        </PopupBody>

        <PopupFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!stakeValid || isPending}>
            {isPending ? 'Mise en cours…' : 'Miser'}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
