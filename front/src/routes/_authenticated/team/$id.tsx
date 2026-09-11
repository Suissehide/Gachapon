import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { TeamMember } from '../../../api/teams.api.ts'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { ConfirmPopup } from '../../../components/team/ConfirmPopup.tsx'
import { ContributionsTable } from '../../../components/team/ContributionsTable.tsx'
import { PerksPanel } from '../../../components/team/PerksPanel.tsx'
import { RaidHistoryPanel } from '../../../components/team/RaidHistoryPanel.tsx'
import { RaidPanel } from '../../../components/team/RaidPanel.tsx'
import { TeamIdentityCard } from '../../../components/team/TeamIdentityCard.tsx'
import { WagersPanel } from '../../../components/team/wagers/WagersPanel.tsx'
import { Button } from '../../../components/ui/button.tsx'
import {
  useTeamDetail,
  useTeamLive,
} from '../../../queries/useTeamProgression.ts'
import { useLeaveTeam } from '../../../queries/useTeams.ts'
import { useAuthStore } from '../../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/team/$id')({
  component: TeamDetailPage,
})

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
  const { mutate: leave } = useLeaveTeam()
  const [leaveOpen, setLeaveOpen] = useState(false)

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
    // `width="wide"` : la seule page en deux colonnes de l'application. Dans
    // la largeur par défaut la colonne de droite tombe à 628 px, où le
    // portrait du boss et la rangée de quatre paliers ne tiennent pas.
    <PageShell width="wide">
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
            perkPoints={team.perkPoints}
            canManage={canManage}
            isOwner={isOwner}
          />

          <RaidHistoryPanel teamId={id} />
        </aside>

        {/* Colonne de droite : raid, duels et paris, contributions. La
            grille ci-dessus appartient au layout de la page et n'est pas
            touchée par ces trois blocs. */}
        <div className="flex min-w-0 flex-col gap-5">
          <RaidPanel teamId={id} />

          <WagersPanel teamId={id} members={wagerMembers} />

          {/* `isOwner` et non `canManage` : la colonne d'exclusion n'existe
              que pour le chef, comme le refus côté serveur. */}
          <ContributionsTable teamId={id} isOwner={isOwner} />
        </div>
      </div>
    </PageShell>
  )
}
