import dayjs from 'dayjs'
import { Clock, Swords, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { TeamMember } from '../../api/teams.api.ts'
import type { DuelView } from '../../api/wagers.api.ts'
import { busyUserIds, hasOpenDuel } from '../../libs/duel.ts'
import { cn, plural } from '../../libs/utils.ts'
import { useSettledDuel } from '../../queries/useSettledDuel.ts'
import {
  useAcceptDuel,
  useCancelDuel,
  useDeclineDuel,
  useWagers,
  useWagersLive,
} from '../../queries/useWagers.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { Button } from '../ui/button.tsx'
import { DuelProposePopup } from './DuelProposePopup.tsx'
import { DuelResultPopup } from './DuelResultPopup.tsx'

/** Nombre de duels réglés gardés à l'écran (le serveur en renvoie plus). */
const HISTORY_SIZE = 10

/** Les scores peuvent tomber sur un demi-point (bonus brillante ×1,5). */
function fmtScore(score: number): string {
  return score.toLocaleString('fr-FR')
}

function pullsLeft(done: number, total: number): number {
  return Math.max(0, total - done)
}

function pullsLabel(done: number, total: number): string {
  const left = pullsLeft(done, total)
  return `${left} tirage${plural(left)} restant${plural(left)}`
}

function ScoreLine({ duel }: { duel: DuelView }) {
  return (
    <span className="font-display text-base font-bold text-text">
      {duel.challenger.username} {fmtScore(duel.challengerScore)}
      <span className="mx-1.5 text-text-light">–</span>
      {duel.opponent.username} {fmtScore(duel.opponentScore)}
    </span>
  )
}

function ActiveDuelRow({ duel }: { duel: DuelView }) {
  const mine = duel.myRole !== 'SPECTATOR'
  const deadline = duel.deadlineAt
  return (
    <li
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-3',
        mine ? 'border-primary/40 bg-primary/10' : 'border-border bg-card/60',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <ScoreLine duel={duel} />
        {deadline !== null && (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-light">
            <Clock className="h-3.5 w-3.5" />
            {dayjs(deadline).isAfter(dayjs())
              ? `Règlement ${dayjs(deadline).fromNow()}`
              : 'Règlement imminent'}
          </span>
        )}
      </div>
      <span className="text-xs text-text-light">
        {duel.challenger.username} :{' '}
        {pullsLabel(duel.challengerPulls, duel.pullCount)} ·{' '}
        {duel.opponent.username} :{' '}
        {pullsLabel(duel.opponentPulls, duel.pullCount)}
      </span>
    </li>
  )
}

function PendingDuelRow({
  duel,
  onAccept,
  onDecline,
  onCancel,
  busy,
}: {
  duel: DuelView
  onAccept: (duelId: string) => void
  onDecline: (duelId: string) => void
  onCancel: (duelId: string) => void
  busy: boolean
}) {
  const mine = duel.myRole !== 'SPECTATOR'
  const text =
    duel.myRole === 'OPPONENT'
      ? `${duel.challenger.username} te défie sur ses ${duel.pullCount} prochains tirages.`
      : duel.myRole === 'CHALLENGER'
        ? `Tu as défié ${duel.opponent.username}. En attente de sa réponse.`
        : `${duel.challenger.username} a défié ${duel.opponent.username}. En attente de réponse.`

  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3',
        mine ? 'border-primary/40 bg-primary/10' : 'border-border bg-card/60',
      )}
    >
      <span className="text-sm text-text">{text}</span>
      {duel.myRole === 'OPPONENT' && (
        <span className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept(duel.id)}
            disabled={busy}
            title={busy ? 'Envoi en cours…' : 'Accepter le défi'}
          >
            {busy ? 'Envoi en cours…' : 'Accepter'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline(duel.id)}
            disabled={busy}
            title={busy ? 'Envoi en cours…' : 'Refuser le défi'}
          >
            {busy ? 'Envoi en cours…' : 'Refuser'}
          </Button>
        </span>
      )}
      {duel.myRole === 'CHALLENGER' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCancel(duel.id)}
          disabled={busy}
          title={busy ? 'Envoi en cours…' : 'Annuler ma proposition'}
        >
          {busy ? 'Envoi en cours…' : 'Annuler'}
        </Button>
      )}
    </li>
  )
}

function SettledDuelRow({ duel }: { duel: DuelView }) {
  const verdict =
    duel.winnerId === null
      ? 'Égalité'
      : duel.winnerId === duel.challenger.id
        ? `${duel.challenger.username} l'emporte`
        : `${duel.opponent.username} l'emporte`
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
      <span className="text-sm text-text">
        {duel.challenger.username} {fmtScore(duel.challengerScore)}
        <span className="mx-1.5 text-text-light">–</span>
        {duel.opponent.username} {fmtScore(duel.opponentScore)}
      </span>
      <span className="font-mono text-xs text-text-light">
        {verdict}
        {duel.settledAt !== null && ` · ${dayjs(duel.settledAt).format('L')}`}
      </span>
    </li>
  )
}

/**
 * Panneau des duels de tirage d'une équipe.
 *
 * `members` est passé en prop plutôt que relu par `useTeam` : la route
 * parente a déjà l'équipe en main, et remonter le hook ici ferait tourner
 * une seconde fois son `useDataFetching` (loader global + notification
 * d'erreur en double) pour la même donnée.
 *
 * Aucun rafraîchissement n'est piloté ici : `useWagers` sonde déjà toutes
 * les dix secondes tant qu'un duel est ACTIVE et `useWagersLive` invalide
 * sur les événements WebSocket.
 */
export function WagersPanel({
  teamId,
  members,
}: {
  teamId: string
  members: TeamMember[]
}) {
  const { data, isLoading, isError, error } = useWagers(teamId)
  useWagersLive(teamId)
  const [proposeOpen, setProposeOpen] = useState(false)
  const teamIds = useMemo(() => [teamId], [teamId])
  const settled = useSettledDuel(teamIds, data?.settledDuels)
  const acceptDuel = useAcceptDuel(teamId)
  const declineDuel = useDeclineDuel(teamId)
  const cancelDuel = useCancelDuel(teamId)
  // `variables` d'une mutation react-query = l'identifiant du duel en vol.
  // Un seul drapeau partagé griserait les boutons de TOUTES les lignes ;
  // aujourd'hui une seule ligne porte des boutons, mais l'invariant ne tient
  // qu'au « un duel ouvert par joueur » du serveur.
  const inFlightDuelId =
    [acceptDuel, declineDuel, cancelDuel].find((m) => m.isPending)?.variables ??
    null

  if (isLoading) {
    return (
      <ArcadeCard>
        <p className="text-center text-text-light">Chargement des duels…</p>
      </ArcadeCard>
    )
  }
  if (isError || !data) {
    return (
      <ArcadeCard>
        <p className="text-center text-destructive">
          {error instanceof Error
            ? error.message
            : "Impossible de charger les duels de l'équipe."}
        </p>
      </ArcadeCard>
    )
  }

  const active = data.duels.filter((d) => d.status === 'ACTIVE')
  const pending = data.duels.filter((d) => d.status === 'PENDING')
  const history = data.settledDuels.slice(0, HISTORY_SIZE)

  const busy = busyUserIds(data.duels)
  // Déduit du rôle porté par la vue, jamais d'une comparaison avec
  // l'identifiant du store : un store momentanément vide rendrait la
  // comparaison fausse pour tout le monde et activerait « Défier » à tort.
  const iAmBusy = hasOpenDuel(data.duels)
  // Quand je ne suis pas occupé, je ne figure pas dans `busy` : le seul
  // membre libre à retrancher du décompte, c'est donc moi.
  const availableOpponents =
    members.filter((m) => !busy.has(m.userId)).length - 1

  // Un bouton grisé muet ne dit rien : le libellé porte lui-même la raison.
  const challengeLabel = iAmBusy
    ? 'Tu as déjà un duel en cours'
    : availableOpponents === 0
      ? 'Aucun coéquipier disponible'
      : 'Défier un coéquipier'
  const canChallenge = !iAmBusy && availableOpponents > 0

  return (
    <ArcadeCard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Duel de tirage
            </div>
            <h2 className="font-display text-2xl font-bold text-text">
              Défis d'équipe
            </h2>
          </div>
          <Button
            className="gap-2"
            disabled={!canChallenge}
            title={challengeLabel}
            onClick={() => setProposeOpen(true)}
          >
            <Swords className="h-4 w-4" />
            {challengeLabel}
          </Button>
        </div>

        {active.length === 0 && pending.length === 0 ? (
          <p className="text-sm text-text-light">
            Aucun duel en cours. Mise tes prochains tirages contre un coéquipier
            : le meilleur score rafle les cartes de l'autre.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((duel) => (
              <ActiveDuelRow key={duel.id} duel={duel} />
            ))}
            {pending.map((duel) => (
              <PendingDuelRow
                key={duel.id}
                duel={duel}
                onAccept={acceptDuel.mutate}
                onDecline={declineDuel.mutate}
                onCancel={cancelDuel.mutate}
                busy={inFlightDuelId === duel.id}
              />
            ))}
          </ul>
        )}

        <div>
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
            <Trophy className="h-3 w-3" />
            Duels réglés
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-text-light">
              Aucun duel réglé pour l'instant.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((duel) => (
                <SettledDuelRow key={duel.id} duel={duel} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <DuelProposePopup
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        teamId={teamId}
        members={members}
        duels={data.duels}
      />

      {settled.duel !== null && (
        <DuelResultPopup
          duel={settled.duel}
          transferredCount={settled.transferredCount}
          onClose={settled.close}
        />
      )}
    </ArcadeCard>
  )
}
