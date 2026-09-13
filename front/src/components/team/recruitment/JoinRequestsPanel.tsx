// JoinRequestsPanel — la file du chef : les candidatures en attente pour
// CETTE équipe, à traiter une par une. Reprend le gabarit visuel
// d'`InviteMemberForm` (`rounded-xl border border-border bg-card p-4`,
// titre `text-sm font-bold text-text`) — c'est le même genre d'outil de
// recrutement, posé dans le même rail.
//
// Le montage est gardé par le parent (`myRole` de la page d'équipe) : ce
// composant n'a besoin que de `teamId`, et se masque lui-même dès que la
// file est vide — pas de carte creuse quand personne n'attend.
//
// `TeamJoinRequest` (back : `teamJoinRequestsResponseSchema`) porte
// `candidate: { id, username, avatar, level }` — la taille de collection,
// elle, n'est exposée nulle part dans l'app (même la liste des membres ne
// la montre pas) et reste donc hors de cette ligne.
//
// Le niveau reprend la chip établie par `TeamCard.tsx` /
// `TeamDirectoryCard.tsx` (`NIV. {n}`, pastille arrondie `bg-muted`) plutôt
// que d'inventer une présentation.
import dayjs from 'dayjs'

import {
  useAcceptJoinRequest,
  useDeclineJoinRequest,
  useTeamJoinRequests,
} from '../../../queries/useRecruitment.ts'
import { RespondButtons } from '../../notifications/NotificationItem.tsx'
import { MemberAvatar } from '../../shared/MemberAvatar.tsx'

export function JoinRequestsPanel({ teamId }: { teamId: string }) {
  const { data } = useTeamJoinRequests(teamId)
  const accept = useAcceptJoinRequest()
  const decline = useDeclineJoinRequest()

  const requests = data?.requests ?? []
  if (requests.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-bold text-text">
        Candidatures ({requests.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {requests.map((request, index) => (
          <li
            key={request.id}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5"
          >
            <MemberAvatar
              letter={request.candidate.username[0]?.toUpperCase() ?? '?'}
              index={index}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text">
                {request.candidate.username}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-light">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-text-light">
                  NIV. {request.candidate.level}
                </span>
                <span className="truncate">
                  Candidature envoyée {dayjs(request.createdAt).fromNow()}
                </span>
              </div>
            </div>
            <RespondButtons
              onAccept={() => accept.mutate(request.id)}
              onDecline={() => decline.mutate(request.id)}
              accepting={accept.isPending && accept.variables === request.id}
              declining={decline.isPending && decline.variables === request.id}
              acceptTitle="Accepter la candidature"
              declineTitle="Refuser la candidature"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
