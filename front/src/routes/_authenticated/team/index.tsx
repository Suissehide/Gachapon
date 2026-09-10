import { createFileRoute } from '@tanstack/react-router'
import { Sparkle, Users } from 'lucide-react'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup } from '../../../components/team/CreateTeamPopup.tsx'
import { TeamCard } from '../../../components/team/TeamCard.tsx'
import { PopupTrigger } from '../../../components/ui/popup.tsx'
import { TEAM_SLOTS } from '../../../constants/teams.constant.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../../queries/useEconomyConfig.ts'
import { useMyTeams } from '../../../queries/useTeams.ts'

// Plafond d'équipes PAR JOUEUR (pas la taille d'une équipe) : constante
// domaine côté serveur (`MAX_TEAMS_PER_USER`, back/.../team.domain.ts), donc
// absente de GlobalConfig / `/economy/config` — reprise en dur ici comme

export const Route = createFileRoute('/_authenticated/team/')({
  component: TeamsPage,
})

function TeamsPage() {
  const { data, isLoading } = useMyTeams()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const teams = data?.teams ?? []
  const atCap = teams.length >= TEAM_SLOTS
  const freeSlots = Math.max(0, TEAM_SLOTS - teams.length)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: 'Gachapon', to: '/play' }, { label: 'Équipes' }]}
        title="Mes équipes"
        subtitle={`${teams.length} / ${TEAM_SLOTS} emplacements utilisés · une équipe monte à ${economy.team.maxMembers} membres`}
        right={
          <CreateTeamPopup
            trigger={
              <PopupTrigger
                variant="default"
                className="gap-2"
                disabled={atCap}
                title={
                  atCap
                    ? `Tu as atteint la limite de ${TEAM_SLOTS} équipes par joueur.`
                    : undefined
                }
              >
                <Users className="h-4 w-4" />
                {atCap
                  ? `Limite de ${TEAM_SLOTS} équipes atteinte`
                  : 'Créer une équipe'}
              </PopupTrigger>
            }
          />
        }
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
          {Array.from({ length: freeSlots }, (_, i) => (
            <CreateTeamPopup
              // biome-ignore lint/suspicious/noArrayIndexKey: emplacements libres décoratifs, compte fixe, jamais réordonnés
              key={i}
              trigger={
                <PopupTrigger
                  variant="dashed"
                  className="h-auto w-full justify-center gap-2.5 rounded-[20px] px-[22px] py-[22px] font-mono text-[11px] uppercase tracking-[0.14em]"
                >
                  <Sparkle className="h-[15px] w-[15px]" />
                  Emplacement libre · Créer ou rejoindre
                </PopupTrigger>
              }
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}
