import { Sparkles, Target } from 'lucide-react'
import { useState } from 'react'

import type { TeamMember } from '../../api/teams.api.ts'
import type { CardRarity } from '../../constants/card.constant.ts'
import { fmtMultiplier } from '../../libs/duel.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useBetQuote, usePlaceBet } from '../../queries/useWagers.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'
import { Input, Select } from '../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { SegmentedControl } from '../ui/segmentedControl.tsx'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  members: TeamMember[]
}

// Le serveur accepte les 5 raretés (`cardRaritySchema`), mais viser COMMON
// ou UNCOMMON serait presque toujours gagné d'avance : la fenêtre ne
// propose que les trois raretés où la cote dit vraiment quelque chose.
const BET_RARITIES: CardRarity[] = ['RARE', 'EPIC', 'LEGENDARY']

/**
 * Le libellé porte la raison, pas seulement l'info-bulle : sur écran
 * tactile il n'y a pas de survol pour révéler un `title`. Sortie du
 * composant pour garder sa complexité cognitive sous le seuil du lint —
 * c'est une châine de conditions sur des primitives, pas du JSX.
 */
function submitLabelFor({
  isPending,
  targetId,
  stakeInput,
  stakeValid,
  stake,
  minStake,
  maxStake,
  quoteReady,
  noWinCause,
}: {
  isPending: boolean
  targetId: string
  stakeInput: string
  stakeValid: boolean
  stake: number
  minStake: number
  maxStake: number
  quoteReady: boolean
  noWinCause: boolean
}): string {
  if (isPending) {
    return 'Pari en cours…'
  }
  if (targetId === '') {
    return 'Choisis une cible'
  }
  if (stakeInput === '') {
    return 'Entre une mise'
  }
  if (!stakeValid) {
    return stake < minStake
      ? `Mise minimum ${minStake} poussière`
      : `Mise maximum ${maxStake} poussière`
  }
  if (!quoteReady) {
    return 'Calcul de la cote…'
  }
  return noWinCause ? 'Ce pari ne rapporterait rien' : 'Parier'
}

/**
 * Cote et gain potentiel affichés en direct pendant la saisie. À cote 1,00
 * le pari ne rapporte rien : ni la pitié ni une garantie nommément ne sont
 * invoquées ici, seulement le fait que le résultat est déjà (quasi) acquis
 * sur cette fenêtre — vrai dans les deux mécanismes qui peuvent produire ce
 * court-circuit côté serveur (voir `bet.domain.ts`).
 */
function QuotePanel({
  quoteReady,
  noWinCause,
  multiplier,
  potentialPayout,
}: {
  quoteReady: boolean
  noWinCause: boolean
  multiplier: number
  potentialPayout: number | null
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-3',
        noWinCause
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-primary/40 bg-primary/10',
      )}
    >
      {quoteReady ? (
        noWinCause ? (
          <span className="text-sm text-text">
            Cote {fmtMultiplier(multiplier)} : le résultat est déjà (quasi)
            certain sur cette fenêtre, ce pari ne rapporterait rien de plus que
            la mise engagée.
          </span>
        ) : (
          <>
            <span className="text-sm text-text">
              Cote actuelle : <strong>×{fmtMultiplier(multiplier)}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-text">
              <Sparkles className="h-3.5 w-3.5 text-dust" />
              Gain potentiel si le pari est gagné :{' '}
              <strong>
                {potentialPayout !== null
                  ? potentialPayout.toLocaleString('fr-FR')
                  : '—'}{' '}
                poussière
              </strong>
            </span>
          </>
        )
      ) : (
        <span className="text-sm text-text-light">Calcul de la cote…</span>
      )}
    </div>
  )
}

/**
 * Fenêtre de placement d'un pari sur le tirage d'un coéquipier.
 *
 * La cote et le gain potentiel sont affichés EN DIRECT pendant la saisie
 * (via `useBetQuote`, temporisé) puisque c'est cette cote qui sera figée au
 * placement — le joueur doit la voir avant de confirmer, pas la découvrir
 * après coup dans la réponse de `placeBet`.
 *
 * À cote 1,00 le pari ne rapporte rien : ni la pitié ni une garantie
 * nommément ne sont invoquées ici, seulement le fait que le résultat est
 * déjà (quasi) acquis sur cette fenêtre — vrai dans les deux mécanismes qui
 * peuvent produire ce court-circuit côté serveur (voir `bet.domain.ts`).
 */
export function BetPlacePopup({ open, onOpenChange, teamId, members }: Props) {
  const [targetId, setTargetId] = useState('')
  const [minRarity, setMinRarity] = useState<CardRarity>('RARE')
  const [stakeInput, setStakeInput] = useState('')

  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { minStake, maxStake, pullWindow } = economy.bet

  // Même précaution que `DuelProposePopup` : pas de repli sur une chaîne
  // vide, qui filtrerait personne et me proposerait moi-même comme cible.
  const myUserId = useAuthStore((s) => s.user?.id)

  const quote = useBetQuote(teamId, targetId, minRarity)
  const { mutate: placeBet, isPending } = usePlaceBet(teamId)

  const options =
    myUserId === undefined
      ? []
      : members
          .filter((m) => m.userId !== myUserId)
          .map((m) => ({ value: m.userId, label: m.user.username }))

  const stake = Number(stakeInput)
  const stakeValid =
    stakeInput !== '' &&
    Number.isInteger(stake) &&
    stake >= minStake &&
    stake <= maxStake

  const quoteReady = quote.data !== undefined
  // La cote plancher (voir `betMultiplier`) : le pari ne peut plus rapporter
  // plus que la mise engagée.
  const noWinCause = quoteReady && (quote.data?.multiplier ?? 0) <= 1

  const potentialPayout =
    quoteReady && stakeValid && quote.data
      ? Math.round(stake * quote.data.multiplier)
      : null

  const reset = () => {
    setTargetId('')
    setMinRarity('RARE')
    setStakeInput('')
  }

  const submit = () => {
    if (!stakeValid || !quoteReady || noWinCause) {
      return
    }
    placeBet(
      { targetId, minRarity, stake },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  const submitLabel = submitLabelFor({
    isPending,
    targetId,
    stakeInput,
    stakeValid,
    stake,
    minStake,
    maxStake,
    quoteReady,
    noWinCause,
  })

  const canSubmit =
    targetId !== '' && stakeValid && quoteReady && !noWinCause && !isPending

  return (
    <Popup
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
        }
        onOpenChange(next)
      }}
    >
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<Target className="h-4 w-4" />}
            subtitle="Mise de la poussière sur le tirage d'un coéquipier"
          >
            Parier sur un coéquipier
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Cible
            </span>
            {options.length === 0 ? (
              <p className="text-sm text-text-light">
                Aucun coéquipier disponible : tu es seul dans cette équipe.
              </p>
            ) : (
              <Select
                id="bet-target"
                options={options}
                value={targetId}
                onValueChange={setTargetId}
                placeholder="Choisis une cible"
                clearable={false}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Rareté visée
            </span>
            <SegmentedControl
              // Chaque rareté porte SA couleur : c'est le seul repère qui
              // distingue un pari sûr d'un pari long, et le joueur la
              // reconnaît déjà de sa collection.
              options={BET_RARITIES.map((rarity) => ({
                value: rarity,
                label: RARITY_LABEL_FR[rarity] ?? rarity,
                color: RARITY_COLOR_VAR[rarity],
              }))}
              value={minRarity}
              onChange={setMinRarity}
              stretch
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Mise
            </span>
            <Input
              type="number"
              min={minStake}
              max={maxStake}
              step={1}
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder={`Entre ${minStake} et ${maxStake} poussière`}
            />
            <span className="text-xs text-text-light">
              Mise entre {minStake.toLocaleString('fr-FR')} et{' '}
              {maxStake.toLocaleString('fr-FR')} poussière.
            </span>
          </div>

          <p className="text-sm text-text-light">
            La cote porte sur les {pullWindow} prochains tirages
            {targetId !== '' ? ' de la cible' : ''} : au moins un tirage{' '}
            {RARITY_LABEL_FR[minRarity] ?? minRarity} ou mieux dans cette
            fenêtre gagne le pari. Sinon la mise est perdue — elle n'est
            remboursée que si la cible n'a fait aucun tirage avant l'échéance.
          </p>

          {targetId !== '' && (
            <QuotePanel
              quoteReady={quoteReady}
              noWinCause={noWinCause}
              multiplier={quote.data?.multiplier ?? 1}
              potentialPayout={potentialPayout}
            />
          )}
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!canSubmit} title={submitLabel}>
            <Target className="h-4 w-4" />
            {submitLabel}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
