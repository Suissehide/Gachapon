import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Crown,
  LogOut,
  Search,
  Shield,
  User,
  UserMinus,
  UserX,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import type { RankedMember, TeamMember } from '../../../api/teams.api.ts'
import { ArcadeCard } from '../../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { ReactTable } from '../../../components/table/reactTable.tsx'
import { ConfirmPopup } from '../../../components/team/ConfirmPopup.tsx'
import { PerksPanel } from '../../../components/team/PerksPanel.tsx'
import { RaidHistoryPanel } from '../../../components/team/RaidHistoryPanel.tsx'
import { RaidPanel } from '../../../components/team/RaidPanel.tsx'
import { TeamIdentityCard } from '../../../components/team/TeamIdentityCard.tsx'
import { WagersPanel } from '../../../components/team/WagersPanel.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { Input } from '../../../components/ui/input.tsx'
import {
  useTeamDetail,
  useTeamLive,
} from '../../../queries/useTeamProgression.ts'
import {
  useLeaveTeam,
  useRemoveMember,
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
  // `useTeamDetail` remplace `useTeam` : même route serveur, même clé de
  // cache (`['teams', id]`), mais la réponse enrichie (niveau, XP, devise,
  // bonus, classement, points hebdo, raids vaincus) dont le rail a besoin.
  // Deux hooks sur la même clé n'auraient servi qu'à faire diverger les
  // types du même JSON.
  const { data: team, isLoading, isError } = useTeamDetail(id)
  // Niveau, points de bonus et rangs poussés en direct par le serveur.
  useTeamLive(id)
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

  // `TeamDetailMember.user` est optionnel (compte supprimé entre deux
  // lectures) alors que `WagersPanel` exige un utilisateur : on écarte les
  // lignes orphelines plutôt que de relâcher le type du panneau.
  const wagerMembers = useMemo<TeamMember[]>(
    () =>
      (team?.members ?? []).flatMap((m) =>
        m.user
          ? [
              {
                id: m.id,
                userId: m.userId,
                role: m.role,
                joinedAt: m.joinedAt,
                user: m.user,
              },
            ]
          : [],
      ),
    [team?.members],
  )

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
      {/* Pas de titre de page : le handoff ne montre au-dessus des deux
          colonnes que le fil d'Ariane — le nom de l'équipe est le titre de
          sa carte d'identité, dans le rail. */}
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipes', to: '/team' },
          { label: team.name },
        ]}
      />

      {/* Grille de la fiche (`.tmB` du handoff) : rail fixe à 340 px,
          contenu en 1fr, gap 24 px, colonnes alignées en haut. Sous 1024 px
          (`lg`), une seule colonne et le rail passe au-dessus — c'est le
          repli « ~1000 px » demandé. `minmax(0,1fr)` et non `1fr` : sans
          ça, une table large de la colonne de droite imposerait sa largeur
          minimale à la grille et déborderait la page. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <TeamIdentityCard
            team={team}
            canManage={canManage}
            isOwner={isOwner}
            myRole={myMember?.role}
            footer={
              !isOwner &&
              myMember && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setLeaveOpen(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Quitter l'équipe
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
              )
            }
          />

          <PerksPanel
            teamId={id}
            perks={team.perks}
            maxRank={team.maxRank}
            perkPoints={team.perkPoints}
            canManage={canManage}
          />

          <RaidHistoryPanel teamId={id} />
        </aside>

        {/* Colonne de droite : un simple emplacement. Le restylage de ce qui
            s'y trouve appartient à la tâche suivante — elle n'a pas à
            toucher la grille ci-dessus. */}
        <div className="flex min-w-0 flex-col gap-5">
          <RaidPanel teamId={id} />

          <WagersPanel teamId={id} members={wagerMembers} />

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
        </div>
      </div>
    </PageShell>
  )
}
