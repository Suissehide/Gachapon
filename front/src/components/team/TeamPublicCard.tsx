// TeamPublicCard — la fiche d'une équipe vue par un NON-membre (lien depuis
// le classement). Même anatomie que `TeamIdentityCard` (emblème, nom,
// devise, tuiles de faits) mais sans rien de réservé aux membres : ni XP,
// ni points hebdo, ni actions de gestion. L'action est la candidature,
// avec les mêmes hooks que l'annuaire de recrutement.
import { Lock, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { TeamPublic } from '../../api/teamProgression.api.ts'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import {
  useApplyToTeam,
  useCancelJoinRequest,
} from '../../queries/useRecruitment.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { StatTile } from '../shared/StatTile.tsx'
import { TeamEmblem } from '../shared/TeamEmblem.tsx'
import { Button } from '../ui/button.tsx'

const fmt = (n: number) => formatNumber(n, currentLocale())

export function TeamPublicCard({ team }: { team: TeamPublic }) {
  const { t } = useTranslation('team')
  const { mutate: apply, isPending: isApplying } = useApplyToTeam()
  const { mutate: cancel, isPending: isCancelling } = useCancelJoinRequest()

  const isFull = team.memberCount >= team.maxMembers

  return (
    <ArcadeCard className="mx-auto w-full max-w-md text-center">
      <TeamEmblem
        hue={team.hue}
        letter={team.name[0]?.toUpperCase() ?? '?'}
        size={72}
        className="mx-auto"
      />

      <h1 className="mt-3.5 font-display text-[30px] font-extrabold leading-tight tracking-[-0.025em] text-text">
        {team.name}
      </h1>

      {team.motto && (
        <p className="mt-2 text-[12.5px] leading-[1.5] text-foreground/55 [text-wrap:pretty]">
          {team.motto}
        </p>
      )}

      {team.description && (
        <p className="mt-3 text-sm leading-[1.55] text-text-light [text-wrap:pretty]">
          {team.description}
        </p>
      )}

      <div className="mt-[18px] grid grid-cols-2 gap-2.5">
        <StatTile value={team.level} label={t('identityCard.levelSublabel')} />
        <StatTile
          value={
            <>
              {team.memberCount}
              <span className="text-foreground/40">/{team.maxMembers}</span>
            </>
          }
          label={t('identityCard.membersLabel')}
        />
        <StatTile
          // Même convention que la carte d'identité : un tiret plutôt qu'un
          // « #0 » tant que l'équipe n'est pas classée.
          value={
            team.rankGlobal === null ? (
              '—'
            ) : (
              <>
                <span className="text-foreground/40">#</span>
                {team.rankGlobal}
              </>
            )
          }
          label={t('identityCard.rankLabel')}
        />
        <StatTile
          value={fmt(team.raidsWon)}
          label={t('identityCard.raidsWonLabel')}
        />
        <StatTile
          className="col-span-2"
          value={fmt(team.activeThisWeek)}
          label={t('publicView.activeLabel')}
        />
      </div>

      <div className="mt-[18px]">
        {team.hasPendingRequest ? (
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-light">
              {t('publicView.pending')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancel(team.id)}
              disabled={isCancelling}
            >
              {t('publicView.cancel')}
            </Button>
          </div>
        ) : !team.recruiting || isFull ? (
          <p className="text-sm text-text-light">
            {team.recruiting
              ? t('publicView.full')
              : t('publicView.notRecruiting')}
          </p>
        ) : (
          <Button
            className="w-full"
            onClick={() => apply(team.id)}
            disabled={isApplying}
          >
            <UserPlus className="h-4 w-4" />
            {t('publicView.apply')}
          </Button>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-light">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        {t('publicView.membersOnly')}
      </p>
    </ArcadeCard>
  )
}
