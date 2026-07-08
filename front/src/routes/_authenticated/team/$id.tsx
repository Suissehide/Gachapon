import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Crown,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
  UserMinus,
  UserX,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import type { RankedMember } from '../../../api/teams.api.ts'
import { ArcadeCard } from '../../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { ReactTable } from '../../../components/table/reactTable.tsx'
import { ConfirmPopup } from '../../../components/team/ConfirmPopup.tsx'
import { InviteMemberPopup } from '../../../components/team/InviteMemberPopup.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { Input } from '../../../components/ui/input.tsx'
import {
  useLeaveTeam,
  useRemoveMember,
  useTeam,
  useTeamRanking,
} from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/team/$id')({
  component: TeamDetailPage,
})

type RankedMemberRow = RankedMember & { id: string }

const ROLE_ICON: Record<string, ReactNode> = {
  OWNER: <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  ADMIN: <Shield className="h-3.5 w-3.5 text-accent" />,
  MEMBER: <User className="h-3.5 w-3.5 text-text-light" />,
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Membre',
}

function ExcludeCell({
  username,
  userId,
  onRemove,
}: {
  username: string
  userId: string
  onRemove: (userId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        title={`Exclure ${username}`}
      >
        <UserMinus className="h-4 w-4" />
      </Button>
      <ConfirmPopup
        open={open}
        onOpenChange={setOpen}
        icon={<UserX className="h-4 w-4" />}
        title="Exclure le membre"
        description={`Êtes-vous sûr de vouloir exclure ${username} de l'équipe ?`}
        confirmLabel="Exclure"
        onConfirm={() => onRemove(userId)}
      />
    </>
  )
}

function TeamDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: team, isLoading, isError } = useTeam(id)
  const { mutate: remove } = useRemoveMember(id)
  const { mutate: leave } = useLeaveTeam()
  const [leaveOpen, setLeaveOpen] = useState(false)
  const {
    data: rankingPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTeamRanking(id)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) {
      return
    }
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

  const [search, setSearch] = useState('')

  const isOwner = team?.ownerId === user?.id
  const myMember = team?.members.find((m) => m.userId === user?.id)
  const canManage = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN'

  const rankedMembers = useMemo<RankedMemberRow[]>(() => {
    const all = (rankingPages?.pages.flatMap((p) => p.members) ?? []).map(
      (m) => ({ ...m, id: m.user.id }),
    )
    const q = search.trim().toLowerCase()
    return q
      ? all.filter((m) => m.user.username.toLowerCase().includes(q))
      : all
  }, [search, rankingPages?.pages])

  const columns = useMemo<ColumnDef<RankedMemberRow>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        accessorKey: 'rank',
        size: 52,
        enableSorting: false,
        cell: ({ getValue }) => {
          const rank = getValue<number>()
          return (
            <span className="inline-block w-full text-center text-sm font-black leading-none">
              {rank <= 3 ? (['🥇', '🥈', '🥉'] as const)[rank - 1] : rank}
            </span>
          )
        },
      },
      {
        id: 'username',
        header: 'Joueur',
        accessorFn: (row) => row.user.username,
        cell: ({ row }) => {
          const { user: u } = row.original
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-xs font-bold text-primary">
                {u.username[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-text">
                {u.username}
                {u.id === user?.id && (
                  <span className="ml-1 text-xs text-text-light">(moi)</span>
                )}
              </span>
            </div>
          )
        },
      },
      {
        id: 'role',
        header: 'Rôle',
        accessorKey: 'role',
        size: 110,
        cell: ({ getValue }) => {
          const role = getValue<string>()
          return (
            <div className="flex items-center gap-1.5 text-xs text-text-light">
              {ROLE_ICON[role]}
              {ROLE_LABEL[role] ?? role}
            </div>
          )
        },
      },
      {
        id: 'score',
        header: 'Score',
        accessorKey: 'score',
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-sm text-text">
            {getValue<number>().toLocaleString()} pts
          </span>
        ),
      },
      ...(team?.ownerId === user?.id
        ? ([
            {
              id: 'actions',
              header: '',
              size: 52,
              enableSorting: false,
              cell: ({ row }) => {
                const entry = row.original
                if (entry.user.id === user?.id || entry.role === 'OWNER') {
                  return null
                }
                return (
                  <ExcludeCell
                    username={entry.user.username}
                    userId={entry.user.id}
                    onRemove={remove}
                  />
                )
              },
            },
          ] as ColumnDef<RankedMemberRow>[])
        : []),
    ],
    [user?.id, remove, team?.ownerId],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !team) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] items-center justify-center">
        <p className="text-text-light">Équipe introuvable ou accès refusé.</p>
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipes', to: '/team' },
          { label: team.name },
        ]}
        title={team.name}
        subtitle={
          <>
            {team.description ? `${team.description} · ` : ''}
            {team.members.length} membre{team.members.length !== 1 ? 's' : ''}
          </>
        }
        right={
          <div className="flex items-center gap-2">
            {canManage && myMember && (
              <InviteMemberPopup teamId={id} userRole={myMember.role} />
            )}
            {isOwner && (
              <Button variant="ghost" size="icon" asChild title="Réglages">
                <Link to="/team/$id/settings" params={{ id }}>
                  <Settings className="h-4 w-4 text-text-light" />
                </Link>
              </Button>
            )}
            {!isOwner && myMember && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setLeaveOpen(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Quitter
                </Button>
                <ConfirmPopup
                  open={leaveOpen}
                  onOpenChange={setLeaveOpen}
                  icon={<LogOut className="h-4 w-4" />}
                  title="Quitter l'équipe"
                  description={`Êtes-vous sûr de vouloir quitter ${team.name} ?`}
                  confirmLabel="Quitter"
                  onConfirm={() =>
                    leave(id, { onSuccess: () => navigate({ to: '/team' }) })
                  }
                />
              </>
            )}
          </div>
        }
      />

      <ArcadeCard>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-light" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un joueur…"
            className="pl-9"
          />
        </div>

        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'rgba(27,23,38,.07)' }}
        >
          <div className="h-[min(80vh,600px)]">
            <ReactTable
              columns={columns}
              data={rankedMembers}
              filterId={`team-ranking-${id}`}
              onRowClick={(row) =>
                navigate({
                  to: '/profile/$username',
                  params: { username: row.original.user.username },
                })
              }
            />
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </ArcadeCard>
    </PageShell>
  )
}
