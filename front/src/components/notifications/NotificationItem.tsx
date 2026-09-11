import { ArrowRight, Check, X } from 'lucide-react'
import type { ReactNode } from 'react'

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
 */
export function NotificationItem({
  icon,
  title,
  subtitle,
  onOpen,
  openTitle,
  actions,
}: {
  icon: ReactNode
  title: string
  subtitle: ReactNode
  onOpen: () => void
  /** Infobulle de la zone cliquable. */
  openTitle: string
  /** Boutons de réponse. Absents = une flèche, et la ligne entière ouvre. */
  actions?: ReactNode
}) {
  const body = (
    <button
      type="button"
      onClick={onOpen}
      title={openTitle}
      className={
        actions
          ? 'group flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left'
          : 'group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60'
      }
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white transition-transform group-hover:scale-105">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-text transition-colors group-hover:text-primary">
          {title}
        </p>
        <p className="truncate text-xs text-text-light">{subtitle}</p>
      </div>
      {actions ? null : (
        <ArrowRight className="h-4 w-4 shrink-0 text-text-light/50 transition-colors group-hover:text-primary" />
      )}
    </button>
  )

  if (!actions) {
    return <li>{body}</li>
  }
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/60">
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
