import { Link } from '@tanstack/react-router'
import { Handshake, Layers, Swords, Trophy } from 'lucide-react'
import { useState } from 'react'

import type {
  DuelHandView,
  DuelPullView,
  DuelView,
  SettledDuelView,
} from '../../api/wagers.api.ts'
import { duelSides } from '../../libs/duel.ts'
import { RARITY_BADGE_VARIANT, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn, plural } from '../../libs/utils.ts'
import { useDuelHands } from '../../queries/useMyPendingDuels.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { CardZoomPopup } from '../shared/tcg-card/CardZoomPopup.tsx'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

function cardCountLabel(count: number): string {
  return `${count} carte${plural(count)}`
}

const VARIANT_LABEL_FR: Record<string, string> = {
  BRILLIANT: 'Brillante',
  HOLOGRAPHIC: 'Holographique',
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
 * Les cartes TRANSFÉRÉES ne sont toujours pas dessinées une à une : ni
 * `duel:settled` ni `DuelView` ne portent leur identité. Les mains, elles, le
 * sont quand `teamId` est fourni — `GET /teams/:id/duels/:duelId/hands` rend
 * les tirages comptés de chaque camp, c'est-à-dire ce qui a fait le score.
 * Le bouton « Voir ma collection » reste la seule vue de l'état d'après.
 */
export function DuelResultPopup({
  duel,
  transferredCount,
  onClose,
  teamId,
}: {
  duel: DuelView
  transferredCount: number
  onClose: () => void
  /** Fourni = les mains des deux joueurs sont chargées et affichées. */
  teamId?: string
}) {
  const { me, them, myScore, theirScore } = duelSides(duel)
  return (
    <DuelResult
      duelId={duel.id}
      teamId={teamId}
      me={me}
      them={them}
      myScore={myScore}
      theirScore={theirScore}
      winnerId={duel.winnerId}
      transferredCount={transferredCount}
      onClose={onClose}
    />
  )
}

/**
 * Même fenêtre, alimentée par `GET /me/duels` plutôt que par la vue d'équipe.
 * C'est le chemin de la pastille de notification : il connaît `teamId`, donc
 * les mains s'affichent toujours ici.
 *
 * `duelSides` ne peut pas servir — elle lit `myRole`, que la liste
 * inter-équipes ne porte pas ; on compare donc les identifiants.
 */
export function SettledDuelResultPopup({
  settled,
  myUserId,
  transferredCount,
  onClose,
}: {
  settled: SettledDuelView
  myUserId: string
  transferredCount: number
  onClose: () => void
}) {
  const iAmChallenger = settled.challenger.id === myUserId
  return (
    <DuelResult
      duelId={settled.id}
      teamId={settled.teamId}
      me={iAmChallenger ? settled.challenger : settled.opponent}
      them={iAmChallenger ? settled.opponent : settled.challenger}
      myScore={iAmChallenger ? settled.challengerScore : settled.opponentScore}
      theirScore={
        iAmChallenger ? settled.opponentScore : settled.challengerScore
      }
      winnerId={settled.winnerId}
      transferredCount={transferredCount}
      onClose={onClose}
    />
  )
}

function DuelResult({
  duelId,
  teamId,
  me,
  them,
  myScore,
  theirScore,
  winnerId,
  transferredCount,
  onClose,
}: {
  duelId: string
  teamId: string | undefined
  me: { id: string; username: string }
  them: { id: string; username: string }
  myScore: number
  theirScore: number
  winnerId: string | null
  transferredCount: number
  onClose: () => void
}) {
  const outcome: Outcome =
    winnerId === null ? 'TIE' : winnerId === me.id ? 'WIN' : 'LOSS'
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

          <DuelHands
            teamId={teamId}
            duelId={duelId}
            meId={me.id}
            themId={them.id}
          />

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
          {/*
            Vers l'équipe, pas vers la collection : c'est là que vit le duel,
            son historique et le reste des enjeux. Absent quand l'appelant ne
            connaît pas l'équipe — il est alors déjà sur sa page.
          */}
          {teamId !== undefined && (
            <Button asChild onClick={onClose}>
              <Link to="/team/$id" params={{ id: teamId }}>
                Voir le duel
              </Link>
            </Button>
          )}
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

/**
 * Les deux mains, côte à côte : la mienne d'abord. Rien n'est rendu tant que
 * `teamId` manque — la route des mains est sous `/teams/:id`, et l'appelant
 * qui ne le connaît pas garde l'écran d'avant, verdict et score seulement.
 */
function DuelHands({
  teamId,
  duelId,
  meId,
  themId,
}: {
  teamId: string | undefined
  duelId: string
  meId: string
  themId: string
}) {
  const { data, isLoading, isError } = useDuelHands(teamId, duelId)
  const [zoomed, setZoomed] = useState<DuelPullView | null>(null)

  if (!teamId || isError) {
    return null
  }
  if (isLoading || !data) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-light">
        Chargement des tirages…
      </p>
    )
  }

  const sideOf = (userId: string) =>
    data.challenger.id === userId ? data.challenger : data.opponent

  return (
    <div className="flex flex-col gap-3">
      <HandRow label="Tes tirages" hand={sideOf(meId)} onZoom={setZoomed} />
      <HandRow label="Les siens" hand={sideOf(themId)} onZoom={setZoomed} />
      {/* La vue agrandie est partagée avec l'historique réglé des duels et le
          boss de raid : `shared/tcg-card/CardZoomPopup`. Elle vivait ici en
          copie, et ses badges de rareté et de variante sont ceux de la
          primitive — les mêmes partout. */}
      <CardZoomPopup
        card={
          zoomed === null
            ? null
            : {
                rarity: zoomed.rarity,
                name: zoomed.name,
                setName: zoomed.setName,
                imageUrl: zoomed.imageUrl,
                variant: zoomed.variant,
                element: zoomed.element,
              }
        }
        onClose={() => setZoomed(null)}
      />
    </div>
  )
}

function HandRow({
  label,
  hand,
  onZoom,
}: {
  label: string
  hand: DuelHandView
  onZoom: (pull: DuelPullView) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        {label}
      </span>
      {hand.pulls.length === 0 ? (
        <p className="text-xs text-text-light">Aucun tirage compté.</p>
      ) : (
        // Défilement horizontal plutôt que retour à la ligne : la fenêtre est
        // étroite et une main peut compter une dizaine de cartes.
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {hand.pulls.map((pull) => (
            <PullCard key={pull.id} pull={pull} onZoom={onZoom} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PullCard({
  pull,
  onZoom,
}: {
  pull: DuelPullView
  onZoom: (pull: DuelPullView) => void
}) {
  return (
    <li className="w-28 shrink-0">
      <button
        type="button"
        onClick={() => onZoom(pull)}
        title={`Agrandir ${pull.name}`}
        aria-label={`Agrandir ${pull.name}`}
        className="block w-full cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <CardDisplay
          compact
          rarity={pull.rarity}
          name={pull.name}
          setName={pull.setName}
          imageUrl={pull.imageUrl}
          variant={pull.variant}
          element={pull.element}
        />
      </button>
    </li>
  )
}

