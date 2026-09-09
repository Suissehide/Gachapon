import { Link } from '@tanstack/react-router'
import { Handshake, Layers, Swords, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { DuelView } from '../../api/wagers.api.ts'
import { wsClient } from '../../lib/ws.ts'
import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type SettledSignal = { duelId: string; transferredCount: number }

/**
 * Écoute `duel:settled` et ne retient que les duels où JE suis partie.
 *
 * L'événement part vers toute l'équipe (voir `DuelDomain#settle`), mais il
 * ne dit pas quel rôle j'y tenais : c'est la vue rafraîchie par
 * `useWagersLive` qui le dit, via `myRole`. On mémorise donc l'identifiant
 * reçu, puis on attend que le duel apparaisse dans `settledDuels` pour
 * décider d'ouvrir — un spectateur ne verra jamais la fenêtre s'ouvrir.
 *
 * `teamIds` est joint en chaîne pour servir de dépendance stable : un
 * tableau recréé à chaque rendu réabonnerait le WebSocket en boucle.
 */
export function useSettledDuel(
  teamIds: string[],
  settledDuels: DuelView[] | undefined,
) {
  const [signal, setSignal] = useState<SettledSignal | null>(null)
  const teamKey = teamIds.join(',')

  useEffect(() => {
    const ids = new Set(teamKey.split(',').filter(Boolean))
    if (ids.size === 0) {
      return
    }
    return wsClient.on((event) => {
      if (event.type !== 'duel:settled' || !ids.has(event.teamId)) {
        return
      }
      setSignal({
        duelId: event.duelId,
        transferredCount: event.transferredCount,
      })
    })
  }, [teamKey])

  const matched =
    signal === null
      ? null
      : (settledDuels?.find((d) => d.id === signal.duelId) ?? null)

  return {
    duel: matched !== null && matched.myRole !== 'SPECTATOR' ? matched : null,
    transferredCount: signal?.transferredCount ?? 0,
    close: () => setSignal(null),
  }
}

function cardCountLabel(count: number): string {
  return `${count} carte${count > 1 ? 's' : ''}`
}

type Outcome = 'WIN' | 'LOSS' | 'TIE'

const TITLES: Record<Outcome, string> = {
  WIN: 'Duel remporté !',
  LOSS: 'Duel perdu',
  TIE: 'Duel : égalité',
}

/**
 * Phrase de verdict. Le cas « zéro carte transférée » est explicite : il
 * arrive quand le perdant n'a fait aucun tirage compté, et un vainqueur qui
 * ne reçoit rien doit savoir que ce n'est pas un bug.
 */
function verdictText(
  outcome: Outcome,
  themName: string,
  transferredCount: number,
): string {
  if (outcome === 'TIE') {
    return `Vous finissez à égalité contre ${themName}. Chacun garde ses cartes.`
  }
  if (outcome === 'WIN') {
    return transferredCount > 0
      ? `Tu bats ${themName} et rafles ${cardCountLabel(transferredCount)} de sa mise.`
      : `Tu bats ${themName}, mais il ne restait aucune carte à transférer.`
  }
  return transferredCount > 0
    ? `${themName} l'emporte et repart avec ${cardCountLabel(transferredCount)} de ta mise.`
    : `${themName} l'emporte. Aucune carte n'a pu être transférée.`
}

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  if (outcome === 'TIE') {
    return <Handshake className="h-4 w-4" />
  }
  if (outcome === 'WIN') {
    return <Trophy className="h-4 w-4" />
  }
  return <Swords className="h-4 w-4" />
}

/**
 * Fenêtre de fin de duel. Elle annonce le verdict, le score final et le
 * nombre de cartes qui ont changé de main.
 *
 * Les cartes transférées ne sont volontairement PAS dessinées une à une :
 * ni `duel:settled` (winnerId + transferredCount) ni `DuelView` ne portent
 * leur identité, et aucune route ne l'expose. Afficher des cartes ici
 * supposerait de les deviner — le compte, lui, vient du serveur. Le bouton
 * « Voir ma collection » renvoie vers la seule vue qui montre vraiment
 * l'état d'après.
 */
export function DuelResultPopup({
  duel,
  transferredCount,
  onClose,
}: {
  duel: DuelView
  transferredCount: number
  onClose: () => void
}) {
  const iAmChallenger = duel.myRole === 'CHALLENGER'
  const me = iAmChallenger ? duel.challenger : duel.opponent
  const them = iAmChallenger ? duel.opponent : duel.challenger
  const myScore = iAmChallenger ? duel.challengerScore : duel.opponentScore
  const theirScore = iAmChallenger ? duel.opponentScore : duel.challengerScore
  const outcome: Outcome =
    duel.winnerId === null ? 'TIE' : duel.winnerId === me.id ? 'WIN' : 'LOSS'
  const iWon = outcome === 'WIN'
  const verdict = verdictText(outcome, them.username, transferredCount)

  return (
    <Popup
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<OutcomeIcon outcome={outcome} />}
            subtitle="Duel de tirage terminé"
          >
            {TITLES[outcome]}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="flex items-stretch gap-3">
            <ScoreSide
              name={me.username}
              score={myScore}
              highlight={iWon}
              label="Toi"
            />
            <div className="flex items-center font-mono text-sm text-text-light">
              vs
            </div>
            <ScoreSide
              name={them.username}
              score={theirScore}
              highlight={outcome === 'LOSS'}
              label="Adversaire"
            />
          </div>

          <p className="text-sm text-text-light">{verdict}</p>

          {transferredCount > 0 && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3',
                iWon
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-destructive/30 bg-destructive/10',
              )}
            >
              <Layers
                className={cn(
                  'h-5 w-5 shrink-0',
                  iWon ? 'text-primary' : 'text-destructive',
                )}
              />
              <span className="text-sm text-text">
                {iWon ? 'Gagné' : 'Perdu'} :{' '}
                <strong>{cardCountLabel(transferredCount)}</strong>
              </span>
            </div>
          )}
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button asChild onClick={onClose}>
            <Link to="/collection">Voir ma collection</Link>
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

function ScoreSide({
  name,
  score,
  highlight,
  label,
}: {
  name: string
  score: number
  highlight: boolean
  label: string
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col rounded-xl border p-3',
        highlight
          ? 'border-primary/50 bg-primary/10'
          : 'border-border bg-card/60',
      )}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        {label}
      </span>
      <span className="truncate text-sm text-text">{name}</span>
      <span className="font-display text-2xl font-bold text-text">
        {score.toLocaleString('fr-FR')}
      </span>
    </div>
  )
}
