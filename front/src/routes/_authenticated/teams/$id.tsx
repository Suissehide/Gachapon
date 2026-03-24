import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'

import {
  DangerZone,
  InviteMemberForm,
  MemberRow,
} from '../../../components/team/index.ts'
import {
  useDeleteTeam,
  useRemoveMember,
  useTeam,
  useTeamRanking,
} from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/teams/$id')({
  component: TeamDetailPage,
})

function TeamDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: team, isLoading, isError } = useTeam(id)
  const { mutate: remove } = useRemoveMember(id)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { data: rankingPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useTeamRanking(id)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const rankedMembers = rankingPages?.pages.flatMap((p) => p.members) ?? []

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !team) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-text-light">Équipe introuvable ou accès refusé.</p>
      </div>
    )
  }

  const myMember = team.members.find((m) => m.userId === user?.id)
  const isOwner = team.ownerId === user?.id
  const canManage = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/teams"
          className="mb-6 flex items-center gap-1.5 text-sm text-text-light transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes équipes
        </Link>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 text-xl font-black text-primary">
            {team.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-text">{team.name}</h1>
            {team.description && (
              <p className="text-sm text-text-light">{team.description}</p>
            )}
            <p className="text-xs text-text-light">
              {team.members.length} membre
              {team.members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {canManage && <InviteMemberForm teamId={id} />}

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Membres</h2>
          <ul className="space-y-2">
            {team.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                isOwner={isOwner}
                isMe={member.userId === user?.id}
                onRemove={() => remove(member.userId)}
              />
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-text">Classement</h2>
          {rankedMembers.length === 0 ? (
            <p className="text-sm text-text-light">Aucun score pour l'instant.</p>
          ) : (
            <ul className="space-y-1">
              {rankedMembers.map((entry) => (
                <li
                  key={`${entry.rank}-${entry.user.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-background"
                >
                  <span className="w-6 text-center text-xs font-black text-text-light">
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                  </span>
                  <div className="flex-1 text-sm font-semibold text-text">
                    {entry.user.username}
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {entry.role}
                  </span>
                  <span className="text-sm font-bold text-text">
                    {entry.score.toLocaleString()} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {isOwner && (
          <DangerZone
            onDelete={() =>
              deleteTeam(id, {
                onSuccess: () => navigate({ to: '/teams' }),
              })
            }
          />
        )}
      </div>
    </div>
  )
}
