import { useNavigate } from '@tanstack/react-router'
import { Bell, Coins, ScrollText, Swords, Trophy, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { SettledDuelView } from '../../api/wagers.api.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { markDuelSeen, readSeenDuels } from '../../libs/seenDuels.ts'
import {
  useAcceptPendingDuel,
  useDeclinePendingDuel,
  useMyPendingDuels,
} from '../../queries/useMyPendingDuels.ts'
import { useMyTargetedBets } from '../../queries/useMyTargetedBets.ts'
import { useClaimableQuestsCount } from '../../queries/useQuests.ts'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from '../../queries/useTeams.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { SettledDuelResultPopup } from '../team/DuelResultPopup.tsx'
import { Button } from '../ui/button.tsx'
import { NotificationDot } from './NotificationDot.tsx'
import { NotificationItem, RespondButtons } from './NotificationItem.tsx'

/** « Tu bats captain 12 – 8 », du point de vue du lecteur. */
function settledSubtitle(
  duel: SettledDuelView,
  meId: string | undefined,
): string {
  const iAmChallenger = duel.challenger.id === meId
  const them = iAmChallenger ? duel.opponent : duel.challenger
  const myScore = iAmChallenger ? duel.challengerScore : duel.opponentScore
  const theirScore = iAmChallenger ? duel.opponentScore : duel.challengerScore
  const verdict =
    duel.winnerId === null
      ? `Égalité contre ${them.username}`
      : duel.winnerId === meId
        ? `Tu bats ${them.username}`
        : `${them.username} te bat`
  return `${verdict} ${myScore.toLocaleString('fr-FR')} – ${theirScore.toLocaleString('fr-FR')}`
}

export function NotificationsBadge() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useMyInvitations()
  const { data: duelData } = useMyPendingDuels()
  const { data: betData } = useMyTargetedBets()
  const meId = useAuthStore((state) => state.user?.id)
  // Lu une fois au montage : `localStorage` ne notifie rien, et la liste ne
  // bouge que par nos propres clics — qu'on répercute dans l'état.
  const [seen, setSeen] = useState(readSeenDuels)
  const [openedDuel, setOpenedDuel] = useState<SettledDuelView | null>(null)
  const questsCount = useClaimableQuestsCount()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const acceptDuel = useAcceptPendingDuel()
  const declineDuel = useDeclinePendingDuel()

  const invitations = data?.invitations ?? []
  const duels = duelData?.duels ?? []
  const bets = betData?.bets ?? []
  const announced = duelData?.settled ?? []
  const settled = announced.filter((d) => !seen.has(d.id))
  const count =
    invitations.length +
    duels.length +
    settled.length +
    bets.length +
    questsCount

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleAccept = (token: string, teamId: string) => {
    accept.mutate(token, {
      onSuccess: () => {
        setIsOpen(false)
        void navigate({ to: '/team/$id', params: { id: teamId } })
      },
    })
  }

  const handleDecline = (token: string) => {
    decline.mutate(token)
  }

  const handleAcceptDuel = (teamId: string, duelId: string) => {
    acceptDuel.mutate(
      { teamId, duelId },
      {
        onSuccess: () => {
          setIsOpen(false)
          void navigate({ to: '/team/$id', params: { id: teamId } })
        },
      },
    )
  }

  const handleDeclineDuel = (teamId: string, duelId: string) => {
    declineDuel.mutate({ teamId, duelId })
  }

  const openResult = (duel: SettledDuelView) => {
    markDuelSeen(
      duel.id,
      announced.map((d) => d.id),
    )
    setSeen((previous) => new Set(previous).add(duel.id))
    setIsOpen(false)
    setOpenedDuel(duel)
  }

  const goToQuests = () => {
    setIsOpen(false)
    void navigate({ to: '/quests' })
  }

  const goToTeam = (teamId: string) => {
    setIsOpen(false)
    void navigate({ to: '/team/$id', params: { id: teamId } })
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="h-10 w-10 rounded-[11px] text-text-light/60 hover:bg-text/[0.06] hover:text-text"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <NotificationDot count={count} />

      {isOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-80 overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-lg:fixed max-lg:inset-x-3 max-lg:top-[116px] max-lg:min-w-0">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-light" />
              <span className="font-display text-sm font-bold text-text">
                Notifications
              </span>
              {count > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                  {count}
                </span>
              )}
            </div>
          </div>

          <div className="p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : count === 0 ? (
              <div className="py-6 text-center">
                <Bell className="mx-auto mb-2 h-7 w-7 text-text-light/30" />
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-light">
                  Aucune notification
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {questsCount > 0 && (
                  <NotificationItem
                    icon={<ScrollText className="h-4 w-4" />}
                    title="Quêtes à récupérer"
                    subtitle={
                      questsCount > 1
                        ? `${questsCount} quêtes prêtes à réclamer`
                        : '1 quête prête à réclamer'
                    }
                    onOpen={goToQuests}
                    openTitle="Voir mes quêtes"
                  />
                )}
                {settled.map((duel) => (
                  <NotificationItem
                    key={duel.id}
                    icon={<Trophy className="h-4 w-4" />}
                    title="Duel terminé"
                    subtitle={settledSubtitle(duel, meId)}
                    onOpen={() => openResult(duel)}
                    openTitle="Voir le résultat"
                  />
                ))}
                {duels.map((duel) => (
                  <NotificationItem
                    key={duel.id}
                    icon={<Swords className="h-4 w-4" />}
                    title={`${duel.challenger.username} te défie`}
                    subtitle={`${duel.team.name} · ${duel.pullCount} tirages`}
                    onOpen={() => goToTeam(duel.teamId)}
                    openTitle="Voir le défi"
                    actions={
                      <RespondButtons
                        onAccept={() => handleAcceptDuel(duel.teamId, duel.id)}
                        onDecline={() =>
                          handleDeclineDuel(duel.teamId, duel.id)
                        }
                        accepting={
                          acceptDuel.isPending &&
                          acceptDuel.variables?.duelId === duel.id
                        }
                        declining={
                          declineDuel.isPending &&
                          declineDuel.variables?.duelId === duel.id
                        }
                        acceptTitle="Relever le défi"
                        declineTitle="Refuser le défi"
                      />
                    }
                  />
                ))}
                {bets.map((bet) => (
                  <NotificationItem
                    key={bet.id}
                    icon={<Coins className="h-4 w-4" />}
                    title={`${bet.bettor.username} a parié sur toi`}
                    subtitle={`${RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity} ou mieux en ${bet.pullWindow} tirages`}
                    onOpen={() => goToTeam(bet.teamId)}
                    openTitle="Voir le pari"
                  />
                ))}
                {invitations.map((inv) => (
                  <NotificationItem
                    key={inv.id}
                    icon={<Users className="h-4 w-4" />}
                    title={inv.team.name}
                    subtitle={
                      inv.invitedBy
                        ? `${inv.invitedBy.username} t'invite à rejoindre`
                        : 'Tu es invité(e) à rejoindre'
                    }
                    onOpen={() => goToTeam(inv.team.id)}
                    openTitle="Voir l'équipe"
                    actions={
                      <RespondButtons
                        onAccept={() => handleAccept(inv.token, inv.team.id)}
                        onDecline={() => handleDecline(inv.token)}
                        accepting={
                          accept.isPending && accept.variables === inv.token
                        }
                        declining={
                          decline.isPending && decline.variables === inv.token
                        }
                        acceptTitle="Accepter et rejoindre"
                        declineTitle="Refuser l'invitation"
                      />
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/*
        Monté HORS du panneau : on le ferme au clic pour dégager la vue, et la
        fenêtre doit lui survivre.
      */}
      {openedDuel !== null && meId !== undefined && (
        <SettledDuelResultPopup
          settled={openedDuel}
          myUserId={meId}
          onClose={() => setOpenedDuel(null)}
        />
      )}
    </div>
  )
}
