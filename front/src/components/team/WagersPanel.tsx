import dayjs from 'dayjs'
import { Clock, Swords, Target, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { TeamMember } from '../../api/teams.api.ts'
import type { BetView, DuelView } from '../../api/wagers.api.ts'
import {
  busyUserIds,
  fmtMultiplier,
  hasOpenDuel,
  pullsLeftLabel,
} from '../../libs/duel.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
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
import { listRowVariants } from '../ui/listRow.tsx'
import { PanelTitle, SectionLabel } from '../ui/sectionHeading.tsx'
import { BetPlacePopup } from './BetPlacePopup.tsx'
import { DuelProposePopup } from './DuelProposePopup.tsx'
import { DuelResultPopup } from './DuelResultPopup.tsx'

/** Nombre d'entrées réglées (duels + paris confondus) gardées à l'écran. */
const HISTORY_SIZE = 10

/** Les scores peuvent tomber sur un demi-point (bonus brillante ×1,5). */
function fmtScore(score: number): string {
  return score.toLocaleString('fr-FR')
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
        'flex flex-col gap-1.5',
        listRowVariants({ tone: mine ? 'mine' : 'default' }),
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
        {pullsLeftLabel(duel.challengerPulls, duel.pullCount)} ·{' '}
        {duel.opponent.username} :{' '}
        {pullsLeftLabel(duel.opponentPulls, duel.pullCount)}
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
        'flex flex-wrap items-center justify-between gap-2',
        listRowVariants({ tone: mine ? 'mine' : 'default' }),
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

function ActiveBetRow({ bet }: { bet: BetView }) {
  const mine = bet.myRole !== 'SPECTATOR'
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  return (
    <li
      className={cn(
        'flex flex-col gap-1.5',
        listRowVariants({ tone: mine ? 'mine' : 'default' }),
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-base font-bold text-text">
          {bet.bettor.username} → {bet.target.username}
          <span className="mx-1.5 text-text-light">·</span>≥ {rarityLabel}
        </span>
        <span className="font-mono text-xs text-text-light">
          Cote ×{fmtMultiplier(bet.multiplier)} · mise{' '}
          {bet.stake.toLocaleString('fr-FR')} poussière
        </span>
      </div>
      <span className="text-xs text-text-light">
        {bet.pullsSeen}/{bet.pullWindow} tirages vus sur la fenêtre
      </span>
    </li>
  )
}

/**
 * Le champ `payout` porte trois sens selon `status` (voir `BetView` dans
 * `wagers.api.ts`) : la totalité du gain si WON, la mise remboursée à
 * l'identique si EXPIRED, rien si LOST. Un libellé unique « gains » aurait
 * fait passer un remboursement pour une victoire — chaque cas a donc son
 * propre texte.
 */
function betVerdictText(bet: BetView): string {
  if (bet.status === 'WON') {
    return `Gagné · +${bet.payout.toLocaleString('fr-FR')} poussière`
  }
  if (bet.status === 'EXPIRED') {
    return `Expiré · mise remboursée (${bet.payout.toLocaleString('fr-FR')} poussière)`
  }
  return 'Perdu · mise perdue'
}

function SettledBetRow({ bet }: { bet: BetView }) {
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
      <span className="text-sm text-text">
        {bet.bettor.username} → {bet.target.username} · ≥ {rarityLabel} · mise{' '}
        {bet.stake.toLocaleString('fr-FR')}
      </span>
      <span className="font-mono text-xs text-text-light">
        {betVerdictText(bet)}
        {bet.settledAt !== null && ` · ${dayjs(bet.settledAt).format('L')}`}
      </span>
    </li>
  )
}

type SettledEntry =
  | { kind: 'duel'; settledAt: string | null; duel: DuelView }
  | { kind: 'bet'; settledAt: string | null; bet: BetView }

/**
 * Historique combiné : duels et paris réglés triés par règlement décroissant,
 * plafonné à HISTORY_SIZE. « dans l'historique existant » — les paris
 * rejoignent la même liste plutôt qu'une seconde section, ce qui aurait
 * dédoublé le rythme visuel du panneau. Sortie du composant pour ne pas
 * alourdir sa complexité cognitive : c'est une fusion de deux tableaux, pas
 * du rendu.
 */
function buildHistory(
  settledDuels: DuelView[],
  settledBets: BetView[],
): SettledEntry[] {
  const entries: SettledEntry[] = [
    ...settledDuels.map(
      (duel): SettledEntry => ({
        kind: 'duel',
        settledAt: duel.settledAt,
        duel,
      }),
    ),
    ...settledBets.map(
      (bet): SettledEntry => ({ kind: 'bet', settledAt: bet.settledAt, bet }),
    ),
  ]
  return entries
    .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''))
    .slice(0, HISTORY_SIZE)
}

function SettledEntryRow({ entry }: { entry: SettledEntry }) {
  return entry.kind === 'duel' ? (
    <SettledDuelRow duel={entry.duel} />
  ) : (
    <SettledBetRow bet={entry.bet} />
  )
}

// Un bouton grisé muet ne dit rien : le libellé porte lui-même la raison.
// Sortie du composant (comme `submitLabelFor` dans `BetPlacePopup`) pour ne
// pas alourdir la complexité cognitive du panneau avec une chaîne de
// conditions sur des primitives.
function challengeLabelFor(
  iAmBusy: boolean,
  availableOpponents: number,
): string {
  if (iAmBusy) {
    return 'Tu as déjà un duel en cours'
  }
  return availableOpponents === 0
    ? 'Aucun coéquipier disponible'
    : 'Défier un coéquipier'
}

/**
 * Panneau des duels et paris de tirage d'une équipe.
 *
 * `members` est passé en prop plutôt que relu par `useTeam` : la route
 * parente a déjà l'équipe en main, et remonter le hook ici ferait tourner
 * une seconde fois son `useDataFetching` (loader global + notification
 * d'erreur en double) pour la même donnée.
 *
 * Aucun rafraîchissement n'est piloté ici : `useWagers` sonde déjà toutes
 * les dix secondes tant qu'un duel est ACTIVE et `useWagersLive` invalide
 * sur les événements WebSocket (duels comme paris).
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
  const [betOpen, setBetOpen] = useState(false)
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
  const activeBets = data.bets
  const history = buildHistory(data.settledDuels, data.settledBets)

  const busy = busyUserIds(data.duels)
  // Déduit du rôle porté par la vue, jamais d'une comparaison avec
  // l'identifiant du store : un store momentanément vide rendrait la
  // comparaison fausse pour tout le monde et activerait « Défier » à tort.
  const iAmBusy = hasOpenDuel(data.duels)
  // Quand je ne suis pas occupé, je ne figure pas dans `busy` : le seul
  // membre libre à retrancher du décompte, c'est donc moi.
  const availableOpponents =
    members.filter((m) => !busy.has(m.userId)).length - 1

  const challengeLabel = challengeLabelFor(iAmBusy, availableOpponents)
  const canChallenge = !iAmBusy && availableOpponents > 0

  // Un pari, contrairement à un duel, peut viser un coéquipier déjà engagé
  // dans un autre pari : le seul blocage visible côté client est l'absence
  // de coéquipier tout court, les plafonds de paris ouverts restent une
  // affaire du serveur (non exposés par `/economy/config`).
  const canBet = members.length > 1
  const betLabel = canBet ? 'Parier' : 'Aucun coéquipier disponible'

  return (
    <ArcadeCard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionLabel>Duel de tirage</SectionLabel>
            <PanelTitle className="mt-1.5">Défis d'équipe</PanelTitle>
          </div>
          <Button
            variant="amber"
            size="action"
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

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <SectionLabel>Pari sur un tirage</SectionLabel>
            <PanelTitle className="mt-1.5">Paris entre coéquipiers</PanelTitle>
          </div>
          <Button
            variant="amber"
            size="action"
            disabled={!canBet}
            title={betLabel}
            onClick={() => setBetOpen(true)}
          >
            <Target className="h-4 w-4" />
            {betLabel}
          </Button>
        </div>

        {activeBets.length === 0 ? (
          <p className="text-sm text-text-light">
            Aucun pari en cours. Mise de la poussière sur le prochain tirage
            d'un coéquipier : la cote vient du serveur et se fige au placement.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeBets.map((bet) => (
              <ActiveBetRow key={bet.id} bet={bet} />
            ))}
          </ul>
        )}

        <div>
          <SectionLabel as="h3" className="mb-2 flex items-center gap-1.5">
            <Trophy className="h-3 w-3" />
            Duels & paris réglés
          </SectionLabel>
          {history.length === 0 ? (
            <p className="text-sm text-text-light">
              Aucun duel ni pari réglé pour l'instant.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((entry) => (
                <SettledEntryRow
                  key={`${entry.kind}-${entry.kind === 'duel' ? entry.duel.id : entry.bet.id}`}
                  entry={entry}
                />
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

      <BetPlacePopup
        open={betOpen}
        onOpenChange={setBetOpen}
        teamId={teamId}
        members={members}
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
