// TeamDirectoryCard — ligne d'équipe de l'annuaire de recrutement
// (la popup « Parcourir les équipes »). Reprend l'anatomie de `TeamCard.tsx` (grille
// `56px_1fr_200px_auto`, `rounded-[20px]`, `border-[1.5px] border-border
// bg-card`, survol ambré limité à la bordure — pas d'ombre, pas de
// décalage) mais en `<div>` : contrairement à « Mes équipes », cette ligne
// n'est pas cliquable. L'action est le bouton de droite, jamais imbriqué
// dans un lien.
import { UserPlus } from 'lucide-react'

import type { DirectoryTeam } from '../../../queries/useRecruitment.ts'
import { TeamEmblem } from '../../shared/TeamEmblem.tsx'
import { Button } from '../../ui/button.tsx'

type TeamDirectoryCardProps = {
  team: DirectoryTeam
  onApply: (teamId: string) => void
  onCancel: (teamId: string) => void
  isApplyPending: boolean
  isCancelPending: boolean
}

export function TeamDirectoryCard({
  team,
  onApply,
  onCancel,
  isApplyPending,
  isCancelPending,
}: TeamDirectoryCardProps) {
  return (
    <div className="grid w-full grid-cols-[56px_1fr_200px_auto] items-center gap-5 rounded-[20px] border-[1.5px] border-border bg-card px-5 py-[18px] transition-colors duration-[.25s] hover:border-primary/40">
      <TeamEmblem
        hue={team.hue}
        letter={team.name[0]?.toUpperCase() ?? '?'}
        size={56}
      />

      <div className="min-w-0">
        <div className="truncate font-display text-[21px] font-extrabold tracking-[-0.02em] text-text">
          {team.name}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-light">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-text-light">
            NIV. {team.level}
          </span>
          <span>
            {team.memberCount}/{team.maxMembers} membres
          </span>
          <span>·</span>
          <span>{team.activeThisWeek} actifs cette semaine</span>
        </div>
      </div>

      <div className="min-w-0">
        {team.motto ? (
          <p className="truncate font-body text-sm italic text-text-light">
            « {team.motto} »
          </p>
        ) : (
          <p className="font-mono text-[10px] text-text-light/60">
            Aucune devise
          </p>
        )}
      </div>

      {team.hasPendingRequest ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-light">
            En attente
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(team.id)}
            disabled={isCancelPending}
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => onApply(team.id)}
          disabled={isApplyPending}
        >
          <UserPlus className="h-4 w-4" />
          Candidater
        </Button>
      )}
    </div>
  )
}
