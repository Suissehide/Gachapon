import { ArrowRight, Check, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'

/**
 * La coquille commune des lignes de la pastille. Elle existe parce que les
 * quatre sources — invitation, défi reçu, duel terminé, pari posé sur moi —
 * partagent exactement la même anatomie : une pastille ronde dégradée, un
 * titre, un sous-titre, et à droite soit une flèche « ça mène quelque part »,
 * soit deux boutons de réponse.
 *
 * Les quatre étaient écrites à la main dans `NotificationsBadge`, qui a fini
 * par franchir le seuil de complexité de Biome à force de les accumuler.
 *
 * La liste des récompenses (`RewardCard`) s'en sert aussi : même pastille,
 * même titre, même sous-titre, avec « Réclamer » à la place des réponses. Sans
 * `onOpen`, la ligne n'est pas cliquable — seule l'action à droite le reste.
 */
export function NotificationItem({
  icon,
  title,
  subtitle,
  onOpen,
  openTitle,
  actions,
  className,
}: {
  icon: ReactNode
  /**
   * `ReactNode` et non `string` : les titres nomment un joueur ou une équipe,
   * et ces noms doivent ressortir de la phrase qui les porte. Voir `Nom` plus
   * bas — la ligne étant déjà grasse, c'est aux mots de liaison de reculer.
   */
  title: ReactNode
  subtitle: ReactNode
  /** Absent = ligne inerte (voir `RewardCard`) ; `actions` est alors requis. */
  onOpen?: () => void
  /** Infobulle de la zone cliquable. */
  openTitle?: string
  /** Boutons de réponse. Absents = une flèche, et la ligne entière ouvre. */
  actions?: ReactNode
  /** Classes supplémentaires sur le `<li>` (état, animation de sortie). */
  className?: string
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white transition-transform group-hover:scale-105">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        {/* Les mots de liaison RECULENT (graisse normale, `text-text-light`)
            pour que les noms portés par `Nom` ressortent. L'inverse — ajouter
            du gras ou de la couleur aux noms — ne marchait pas : la ligne
            était déjà grasse, et l'ambre est déjà pris par le survol. */}
        <p className="truncate font-display text-sm font-normal text-text-light transition-colors group-hover:text-primary">
          {title}
        </p>
        <p className="truncate text-xs text-text-light">{subtitle}</p>
      </div>
      {actions ? null : (
        <ArrowRight className="h-4 w-4 shrink-0 text-text-light/50 transition-colors group-hover:text-primary" />
      )}
    </>
  )

  const row = 'flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3'

  if (!onOpen) {
    return (
      <li className={cn(row, className)}>
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </li>
    )
  }

  const body = (
    <button
      type="button"
      onClick={onOpen}
      title={openTitle}
      className={cn(
        'group cursor-pointer text-left',
        actions
          ? 'flex min-w-0 flex-1 items-center gap-3'
          : cn(row, 'w-full transition-colors hover:bg-muted/60'),
      )}
    >
      {content}
    </button>
  )

  if (!actions) {
    return <li className={className}>{body}</li>
  }
  return (
    <li className={cn(row, 'transition-colors hover:bg-muted/60', className)}>
      {body}
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </li>
  )
}

/** Accepter / refuser, avec le rond qui tourne pendant l'appel. */
export function RespondButtons({
  onAccept,
  onDecline,
  accepting,
  declining,
  acceptTitle,
  declineTitle,
}: {
  onAccept: () => void
  onDecline: () => void
  accepting: boolean
  declining: boolean
  acceptTitle: string
  declineTitle: string
}) {
  const busy = accepting || declining
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Accepter"
        title={acceptTitle}
        disabled={busy}
        onClick={onAccept}
        className="h-8 w-8 rounded-full text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-50"
      >
        {accepting ? <Spinner /> : <Check className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Refuser"
        title={declineTitle}
        disabled={busy}
        onClick={onDecline}
        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {declining ? <Spinner /> : <X className="h-4 w-4" />}
      </Button>
    </>
  )
}

function Spinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  )
}

/**
 * Un nom propre dans un titre de notification — pseudo de joueur ou nom
 * d'équipe.
 *
 * Il portait un « @ » avant ; il ne marquait que les pseudos, laissait les
 * équipes sans repère, et ne disait rien dans les cinq titres qui ne
 * l'utilisaient pas. Ici c'est la graisse et la densité qui font le travail,
 * pour les deux sortes de noms.
 *
 * `group-hover:text-primary` est répété : sans lui, ce span garderait son
 * `text-text` quand la ligne entière vire à l'ambre au survol.
 */
export function Nom({ children }: { children: ReactNode }) {
  return (
    <span className="font-bold text-text transition-colors group-hover:text-primary">
      {children}
    </span>
  )
}
