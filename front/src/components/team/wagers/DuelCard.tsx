// Carte « Défis d'équipe » — la sœur gauche de la section duels/paris.
//
// La phrase d'en-tête ne reprend PAS celle du handoff (« la meilleure carte
// obtenue l'emporte ») : le duel se tranche sur la SOMME des cartes tirées,
// au barème du classement de collection et avec un ×1,5 pour les brillantes
// (`duelScoreHalfPoints`, back/domain/wagers/wager-rules.ts). Annoncer « la
// meilleure carte » ferait jouer les joueurs sur une règle qui n'existe pas.
// Reprend `docs/design_handoff_duels/reference/equipe-duels.css`
// (`.dz-live`, `.dz-pending`, `.dz-vs`, `.dz-pulls`, `.dz-mini--danger`).
//
// La carte parle de MON duel : le bloc ambré est un face-à-face « TOI /
// ADVERSAIRE », qui n'a pas de sens pour un spectateur. Les duels entre
// coéquipiers vivent donc sous le bloc, en lignes compactes — visibles sans
// occuper la place d'une action.
//
// Quatre états, jamais un bouton grisé : duel en cours, défi reçu (que la
// maquette ne dessine pas, et qui reçoit ici le même traitement ambré parce
// qu'il est le seul à réclamer une réponse), défi envoyé, et rien du tout.
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Sparkles, Swords } from 'lucide-react'

import type { DuelView } from '../../../api/wagers.api.ts'
import { duelSides, pullsLeft } from '../../../libs/duel.ts'
import { cn } from '../../../libs/utils.ts'
import { MemberAvatar } from '../../shared/MemberAvatar.tsx'
import { Button } from '../../ui/button.tsx'
import { LockedPill, WagerCard, WagerCardHead, WagerEmpty } from './parts.tsx'

/** Teintes du face-à-face : ambre pour le lecteur, violet pour l'autre. */
const MY_HUE = 32
const THEIR_HUE = 265

/** Les scores peuvent tomber sur un demi-point (bonus brillante ×1,5). */
function fmtScore(score: number): string {
  return score.toLocaleString('fr-FR')
}

/**
 * Un côté du face-à-face. `side` inverse l'ordre ET l'alignement : la
 * maquette met l'avatar de l'adversaire à l'extérieur, comme sur un tableau
 * d'affichage de match.
 */
function DuelFace({
  name,
  caption,
  hue,
  side,
}: {
  name: string
  /**
   * « TOI » / « ADVERSAIRE ». Surtout PAS nommée `role` : Biome lirait la
   * prop comme un rôle ARIA et la refuserait, et elle finirait un jour sur
   * un nœud du DOM comme `caption="TOI"`.
   */
  caption: string
  hue: number
  side: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5',
        side === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <MemberAvatar
        letter={name[0]?.toUpperCase() ?? '?'}
        hue={hue}
        size={36}
      />
      <div className="min-w-0">
        <div className="truncate text-[14.5px] font-bold text-text">{name}</div>
        <div className="font-mono text-[10px] tracking-[0.12em] text-foreground/45">
          {caption}
        </div>
      </div>
    </div>
  )
}

/** Une rangée de pips : autant d'ambrés que de tirages restants. */
function PullPips({
  left,
  total,
  align,
}: {
  left: number
  total: number
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cn('flex gap-1.5', align === 'right' && 'justify-end')}
      // Le compte est déjà dit en toutes lettres par le label central ; les
      // pips sont un doublon graphique, que rien n'oblige à relire.
      aria-hidden
    >
      {Array.from({ length: total }, (_, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: pips décoratifs, compte fixe (pullCount), jamais réordonnés
          key={`pip-${i}`}
          className={cn(
            'h-[5px] w-full max-w-[18px] rounded-[3px]',
            i < left ? 'bg-primary' : 'bg-foreground/14',
          )}
        />
      ))}
    </div>
  )
}

/** Coque ambrée commune au duel en cours et au défi reçu. */
function LiveShell({
  label,
  pill,
  children,
}: {
  label: string
  pill: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-[18px] border-[1.5px] border-primary-light bg-linear-[135deg,#fff7ed,#fffdf9] px-[18px] pb-3.5 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          {label}
        </span>
        <LockedPill>{pill}</LockedPill>
      </div>
      {children}
    </div>
  )
}

function VsRow({ duel, center }: { duel: DuelView; center: React.ReactNode }) {
  const { me, them } = duelSides(duel)
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3.5">
      <DuelFace name={me.username} caption="TOI" hue={MY_HUE} side="left" />
      {center}
      <DuelFace
        name={them.username}
        caption="ADVERSAIRE"
        hue={THEIR_HUE}
        side="right"
      />
    </div>
  )
}

function ActiveDuel({ duel }: { duel: DuelView }) {
  const { myScore, theirScore, myPulls, theirPulls } = duelSides(duel)
  const deadline = duel.deadlineAt
  const pill =
    deadline === null
      ? 'RÈGLEMENT À L’ÉCHÉANCE'
      : dayjs(deadline).isAfter(dayjs())
        ? `RÈGLEMENT ${dayjs(deadline).fromNow().toUpperCase()}`
        : 'RÈGLEMENT IMMINENT'

  return (
    <LiveShell label="Duel en cours" pill={pill}>
      <VsRow
        duel={duel}
        center={
          <div className="flex items-baseline gap-2 font-display text-[30px] font-extrabold tabular-nums tracking-[-0.02em]">
            <span className={myScore > theirScore ? 'text-primary-dark' : ''}>
              {fmtScore(myScore)}
            </span>
            <span className="text-foreground/28">–</span>
            <span className={theirScore > myScore ? 'text-primary-dark' : ''}>
              {fmtScore(theirScore)}
            </span>
          </div>
        }
      />

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3.5">
        <PullPips
          left={pullsLeft(myPulls, duel.pullCount)}
          total={duel.pullCount}
          align="left"
        />
        <span className="font-mono text-[9px] tracking-[0.14em] text-foreground/45">
          TIRAGES RESTANTS
        </span>
        <PullPips
          left={pullsLeft(theirPulls, duel.pullCount)}
          total={duel.pullCount}
          align="right"
        />
      </div>

      <div className="mt-3.5 flex justify-center">
        <Button variant="amber" size="action" asChild>
          <Link to="/play">
            <Sparkles className="h-4 w-4" />
            Tirer pour marquer
          </Link>
        </Button>
      </div>
    </LiveShell>
  )
}

/**
 * Défi reçu. La maquette ne le dessine pas — elle ne connaît que le défi
 * ENVOYÉ — mais c'est le seul état qui attend une action de ma part, d'où
 * le traitement ambré du duel en cours plutôt que le pointillé discret.
 *
 * La pilule porte le nombre de tirages et non un compte à rebours : le délai
 * d'acceptation (`duel.acceptHours`) n'est exposé ni par cette vue ni par
 * `/economy/config`, et afficher une échéance devinée serait pire que de
 * n'en afficher aucune.
 */
function ReceivedDuel({
  duel,
  onAccept,
  onDecline,
  busy,
}: {
  duel: DuelView
  onAccept: (duelId: string) => void
  onDecline: (duelId: string) => void
  busy: boolean
}) {
  return (
    <LiveShell label="Défi reçu" pill={`${duel.pullCount} TIRAGES CHACUN`}>
      <VsRow duel={duel} center={<Swords className="h-5 w-5 text-primary" />} />
      <div className="mt-3.5 flex justify-center gap-2">
        <Button
          variant="amber"
          size="action"
          disabled={busy}
          onClick={() => onAccept(duel.id)}
        >
          {busy ? 'Envoi en cours…' : 'Accepter'}
        </Button>
        <Button
          variant="outline"
          size="action"
          disabled={busy}
          onClick={() => onDecline(duel.id)}
        >
          Refuser
        </Button>
      </div>
    </LiveShell>
  )
}

function SentDuel({
  duel,
  onCancel,
  busy,
}: {
  duel: DuelView
  onCancel: (duelId: string) => void
  busy: boolean
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-primary-light bg-[#fffdf9] px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] text-text">
          Défi envoyé à <strong>{duel.opponent.username}</strong>
        </p>
        <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-foreground/45">
          EN ATTENTE DE SA RÉPONSE
        </p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onCancel(duel.id)}
        className="shrink-0 rounded-full border border-foreground/10 bg-surface-2 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.1em] text-foreground/45 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        {busy ? 'ANNULATION…' : 'ANNULER'}
      </button>
    </div>
  )
}

/** Les duels des autres, sous le bloc : lisibles, jamais actionnables. */
function SpectatorDuels({ duels }: { duels: DuelView[] }) {
  return (
    <div className="mt-4">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-foreground/45">
        En cours dans l’équipe
      </span>
      <ul className="mt-2 flex flex-col gap-1.5">
        {duels.map((duel) => (
          <li
            key={duel.id}
            className="flex items-baseline justify-between gap-3 text-[12.5px]"
          >
            <span className="truncate text-foreground/70">
              {duel.challenger.username}{' '}
              <span className="font-display font-bold tabular-nums text-text">
                {fmtScore(duel.challengerScore)}–{fmtScore(duel.opponentScore)}
              </span>{' '}
              {duel.opponent.username}
            </span>
            <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] text-foreground/45">
              {duel.status === 'PENDING'
                ? 'EN ATTENTE'
                : `${duel.challengerPulls + duel.opponentPulls}/${duel.pullCount * 2} TIRAGES`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DuelCard({
  mine,
  spectated,
  canChallenge,
  lockedReason,
  onChallenge,
  onAccept,
  onDecline,
  onCancel,
  inFlightDuelId,
}: {
  /** MON duel non tranché, s'il y en a un. */
  mine: DuelView | null
  /** Les duels des autres, non tranchés. */
  spectated: DuelView[]
  canChallenge: boolean
  /** Pourquoi je ne peux pas défier — affiché à la place du bouton. */
  lockedReason: string
  onChallenge: () => void
  onAccept: (duelId: string) => void
  onDecline: (duelId: string) => void
  onCancel: (duelId: string) => void
  inFlightDuelId: string | null
}) {
  return (
    <WagerCard>
      <WagerCardHead
        label="Duel de tirage"
        title="Défis d’équipe"
        note="Deux coéquipiers tirent le même nombre de fois. Le meilleur total de cartes l’emporte, et rafle la main du perdant."
        action={
          canChallenge ? (
            <Button variant="amber" size="action" onClick={onChallenge}>
              <Swords className="h-4 w-4" />
              Défier
            </Button>
          ) : (
            <LockedPill icon={Swords}>{lockedReason}</LockedPill>
          )
        }
      />

      {mine === null ? (
        <WagerEmpty icon={Swords}>
          Aucun duel en cours. Défie un coéquipier et comparez vos tirages sur
          une même fenêtre.
        </WagerEmpty>
      ) : mine.status === 'ACTIVE' ? (
        <ActiveDuel duel={mine} />
      ) : mine.myRole === 'OPPONENT' ? (
        <ReceivedDuel
          duel={mine}
          onAccept={onAccept}
          onDecline={onDecline}
          busy={inFlightDuelId === mine.id}
        />
      ) : (
        <SentDuel
          duel={mine}
          onCancel={onCancel}
          busy={inFlightDuelId === mine.id}
        />
      )}

      {spectated.length > 0 && <SpectatorDuels duels={spectated} />}
    </WagerCard>
  )
}
