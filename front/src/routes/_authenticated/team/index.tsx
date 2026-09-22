import { createFileRoute } from '@tanstack/react-router'
import { Compass, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { CreateTeamPopup } from '../../../components/team/CreateTeamPopup.tsx'
import { MyJoinRequestsList } from '../../../components/team/recruitment/MyJoinRequestsList.tsx'
import { TeamDirectoryPopup } from '../../../components/team/recruitment/TeamDirectoryPopup.tsx'
import { TeamCard } from '../../../components/team/TeamCard.tsx'
import { EmptyState } from '../../../components/ui/emptyState.tsx'
import { PopupTrigger } from '../../../components/ui/popup.tsx'
import { TEAM_SLOTS } from '../../../constants/teams.constant.ts'
import { useMyTeams } from '../../../queries/useTeams.ts'

export const Route = createFileRoute('/_authenticated/team/')({
  component: TeamsPage,
})

function TeamsPage() {
  const { t } = useTranslation('team')
  const { data, isLoading } = useMyTeams()

  const teams = data?.teams ?? []
  const atCap = teams.length >= TEAM_SLOTS

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: t('page.breadcrumbHome'), to: '/play' },
          { label: t('page.breadcrumbTeams') },
        ]}
        title={t('page.title')}
        right={
          <div className="flex gap-2">
            <TeamDirectoryPopup
              trigger={
                <PopupTrigger variant="outline" className="gap-2">
                  <Compass className="h-4 w-4" />
                  {t('page.browseTeams')}
                </PopupTrigger>
              }
            />
            <CreateTeamPopup
              trigger={
                <PopupTrigger
                  variant="default"
                  className="gap-2"
                  disabled={atCap}
                  title={
                    atCap
                      ? t('page.atCapTitle', { max: TEAM_SLOTS })
                      : undefined
                  }
                >
                  <Users className="h-4 w-4" />
                  {atCap
                    ? t('page.atCapLabel', { max: TEAM_SLOTS })
                    : t('page.createTeam')}
                </PopupTrigger>
              }
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('page.emptyTitle')}
              action={
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <TeamDirectoryPopup
                    trigger={
                      <PopupTrigger variant="outline" size="sm">
                        <Compass className="h-4 w-4" />
                        {t('page.browseTeams')}
                      </PopupTrigger>
                    }
                  />
                  <CreateTeamPopup
                    trigger={
                      <PopupTrigger variant="default" size="sm">
                        <Users className="h-4 w-4" />
                        {t('page.createTeam')}
                      </PopupTrigger>
                    }
                  />
                </div>
              }
            >
              {t('page.emptyBody')}
            </EmptyState>
          ) : (
            teams.map((team) => <TeamCard key={team.id} team={team} />)
          )}
        </div>
      )}

      <MyJoinRequestsList />
    </PageShell>
  )
}
