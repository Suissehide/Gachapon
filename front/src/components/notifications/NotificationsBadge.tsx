import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  Bell,
  Coins,
  ScrollText,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SettledDuelView } from '../../api/wagers.api.ts'
import i18n, { currentLocale } from '../../i18n/index.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { markDuelSeen, readSeenDuels } from '../../libs/seenDuels.ts'
import {
  isJoinSeen,
  markJoinSeen,
  readSeenJoins,
  seenKey,
} from '../../libs/seenJoinRequests.ts'
import { formatNumber } from '../../libs/utils.ts'
import {
  useAcceptPendingDuel,
  useDeclinePendingDuel,
  useMyPendingDuels,
} from '../../queries/useMyPendingDuels.ts'
import { useMyTargetedBets } from '../../queries/useMyTargetedBets.ts'
import { useClaimableQuestsCount } from '../../queries/useQuests.ts'
import type {
  MyJoinRequest,
  TeamJoinRequestWithTeam,
} from '../../queries/useRecruitment.ts'
import {
  useAcceptJoinRequest,
  useDeclineJoinRequest,
  useMyJoinRequests,
  useMyTeamsJoinRequests,
} from '../../queries/useRecruitment.ts'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
} from '../../queries/useTeams.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { SettledDuelResultPopup } from '../team/DuelResultPopup.tsx'
import { Button } from '../ui/button.tsx'
import { NotificationDot } from './NotificationDot.tsx'
import { Nom, NotificationItem, RespondButtons } from './NotificationItem.tsx'

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
      ? i18n.t('notifications:duelSettled.draw', { opponent: them.username })
      : duel.winnerId === meId
        ? i18n.t('notifications:duelSettled.win', { opponent: them.username })
        : i18n.t('notifications:duelSettled.loss', {
            opponent: them.username,
          })
  const locale = currentLocale()
  return `${verdict} ${formatNumber(myScore, locale)} – ${formatNumber(theirScore, locale)}`
}

/**
 * La file du chef, côté cloche : une ligne par candidature en attente sur
 * une équipe où le lecteur est OWNER/ADMIN. Extrait à part pour que
 * `NotificationsBadge` — déjà à cinq sources avant celle-ci — n'accumule
 * pas un sixième bloc de JSX + mutations en ligne.
 */
function JoinRequestItems({
  requests,
  onOpen,
  acceptJoin,
  declineJoin,
}: {
  requests: TeamJoinRequestWithTeam[]
  onOpen: (teamId: string) => void
  acceptJoin: ReturnType<typeof useAcceptJoinRequest>
  declineJoin: ReturnType<typeof useDeclineJoinRequest>
}) {
  const { t } = useTranslation('notifications')
  return (
    <>
      {requests.map((request) => (
        <NotificationItem
          key={request.id}
          icon={<UserPlus className="h-4 w-4" />}
          // Pseudo NU, sans « @ » : les titres de la cloche sont des phrases
          // (« X te défie », « X a parié sur toi », « X t'invite à rejoindre »)
          // et aucune ne prefixe son pseudo. Le « @ » reste de mise là où un
          // pseudo est une étiquette dans une liste — le panneau des
          // candidatures, par exemple.
          title={
            <>
              <Nom>{request.candidate.username}</Nom>{' '}
              {t('joinRequest.wantsToJoin')} <Nom>{request.teamName}</Nom>
            </>
          }
          subtitle={t('joinRequest.sentAgo', {
            time: dayjs(request.createdAt).fromNow(),
          })}
          onOpen={() => onOpen(request.teamId)}
          openTitle={t('joinRequest.openTitle')}
          actions={
            <RespondButtons
              onAccept={() => acceptJoin.mutate(request.id)}
              onDecline={() => declineJoin.mutate(request.id)}
              accepting={
                acceptJoin.isPending && acceptJoin.variables === request.id
              }
              declining={
                declineJoin.isPending && declineJoin.variables === request.id
              }
              acceptTitle={t('joinRequest.acceptTitle')}
              declineTitle={t('joinRequest.declineTitle')}
            />
          }
        />
      ))}
    </>
  )
}

/**
 * L'annonce d'acceptation, côté candidat : la seule bonne nouvelle qu'une
 * candidature accueille — la file du chef ne le concerne pas une fois
 * acceptée, et `MyJoinRequestsList` n'affiche que l'attente et le refus.
 */
function AcceptedJoinItems({
  requests,
  onOpen,
}: {
  requests: MyJoinRequest[]
  onOpen: (request: MyJoinRequest) => void
}) {
  const { t } = useTranslation('notifications')
  return (
    <>
      {requests.map((request) => (
        <NotificationItem
          key={request.id}
          icon={<Users className="h-4 w-4" />}
          title={
            <>
              {t('acceptedJoin.joinedPrefix')} <Nom>{request.teamName}</Nom>
            </>
          }
          subtitle={t('acceptedJoin.subtitle')}
          onOpen={() => onOpen(request)}
          openTitle={t('acceptedJoin.openTitle')}
        />
      ))}
    </>
  )
}

export function NotificationsBadge() {
  const { t } = useTranslation('notifications')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useMyInvitations()
  const { data: duelData } = useMyPendingDuels()
  const { data: betData } = useMyTargetedBets()
  const { requests: joinRequests } = useMyTeamsJoinRequests()
  const { data: myJoinData } = useMyJoinRequests()
  const meId = useAuthStore((state) => state.user?.id)
  // Lu une fois au montage : `localStorage` ne notifie rien, et la liste ne
  // bouge que par nos propres clics — qu'on répercute dans l'état.
  const [seen, setSeen] = useState(readSeenDuels)
  const [seenJoins, setSeenJoins] = useState(readSeenJoins)
  const [openedDuel, setOpenedDuel] = useState<SettledDuelView | null>(null)
  const questsCount = useClaimableQuestsCount()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const acceptDuel = useAcceptPendingDuel()
  const declineDuel = useDeclinePendingDuel()
  const acceptJoin = useAcceptJoinRequest()
  const declineJoin = useDeclineJoinRequest()

  const invitations = data?.invitations ?? []
  const duels = duelData?.duels ?? []
  const bets = betData?.bets ?? []
  const announced = duelData?.settled ?? []
  const settled = announced.filter((d) => !seen.has(d.id))
  const acceptedJoins = (myJoinData?.requests ?? []).filter(
    (r) =>
      r.status === 'ACCEPTED' &&
      !isJoinSeen(seenJoins, r.id, r.decidedAt ?? ''),
  )
  const count =
    invitations.length +
    duels.length +
    settled.length +
    bets.length +
    questsCount +
    joinRequests.length +
    acceptedJoins.length

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

  const openJoinAnnouncement = (request: MyJoinRequest) => {
    const decidedAt = request.decidedAt ?? ''
    markJoinSeen(request.id, decidedAt)
    setSeenJoins((previous) =>
      new Set(previous).add(seenKey(request.id, decidedAt)),
    )
    goToTeam(request.teamId)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('bellAriaLabel')}
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
                {t('panelTitle')}
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
                  {t('empty')}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {questsCount > 0 && (
                  <NotificationItem
                    icon={<ScrollText className="h-4 w-4" />}
                    title={<Nom>{t('quests.title')}</Nom>}
                    subtitle={t('quests.subtitle', { count: questsCount })}
                    onOpen={goToQuests}
                    openTitle={t('quests.openTitle')}
                  />
                )}
                {settled.map((duel) => (
                  <NotificationItem
                    key={duel.id}
                    icon={<Trophy className="h-4 w-4" />}
                    title={<Nom>{t('duelSettled.title')}</Nom>}
                    subtitle={settledSubtitle(duel, meId)}
                    onOpen={() => openResult(duel)}
                    openTitle={t('duelSettled.openTitle')}
                  />
                ))}
                {duels.map((duel) => (
                  <NotificationItem
                    key={duel.id}
                    icon={<Swords className="h-4 w-4" />}
                    title={
                      <>
                        <Nom>{duel.challenger.username}</Nom>{' '}
                        {t('duelChallenge.challengedBySuffix')}
                      </>
                    }
                    subtitle={t('duelChallenge.subtitle', {
                      team: duel.team.name,
                      count: duel.pullCount,
                    })}
                    onOpen={() => goToTeam(duel.teamId)}
                    openTitle={t('duelChallenge.openTitle')}
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
                        acceptTitle={t('duelChallenge.acceptTitle')}
                        declineTitle={t('duelChallenge.declineTitle')}
                      />
                    }
                  />
                ))}
                <JoinRequestItems
                  requests={joinRequests}
                  onOpen={goToTeam}
                  acceptJoin={acceptJoin}
                  declineJoin={declineJoin}
                />
                <AcceptedJoinItems
                  requests={acceptedJoins}
                  onOpen={openJoinAnnouncement}
                />
                {bets.map((bet) => (
                  <NotificationItem
                    key={bet.id}
                    icon={<Coins className="h-4 w-4" />}
                    title={
                      <>
                        <Nom>{bet.bettor.username}</Nom>{' '}
                        {t('bet.betOnYouSuffix')}
                      </>
                    }
                    subtitle={t('bet.subtitle', {
                      rarity: RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity,
                      count: bet.pullWindow,
                    })}
                    onOpen={() => goToTeam(bet.teamId)}
                    openTitle={t('bet.openTitle')}
                  />
                ))}
                {invitations.map((inv) => (
                  <NotificationItem
                    key={inv.id}
                    icon={<Users className="h-4 w-4" />}
                    title={<Nom>{inv.team.name}</Nom>}
                    subtitle={
                      inv.invitedBy ? (
                        <>
                          {inv.invitedBy.username}{' '}
                          {t('invitation.invitedBySuffix')}
                        </>
                      ) : (
                        t('invitation.invitedGeneric')
                      )
                    }
                    onOpen={() => goToTeam(inv.team.id)}
                    openTitle={t('invitation.openTitle')}
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
                        acceptTitle={t('invitation.acceptTitle')}
                        declineTitle={t('invitation.declineTitle')}
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
