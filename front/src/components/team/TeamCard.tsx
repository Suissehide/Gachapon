// TeamCard — ligne d'équipe de l'écran « Mes équipes ». Reprend
// `docs/design_handoff_equipe/equipe.css` (`.tml-card` et enfants) : grille
// 56px/1fr/200px/auto, toute la ligne cliquable, survol ambré.
//
// `team` vient tel quel de `GET /teams` (`TeamSummary`) : le rôle affiché est
// déjà celui du viewer et déjà traduit côté serveur (`myRoleLabel`) — ne pas
// le recalculer depuis `ownerId`, ça avait fini par afficher un officier
// comme simple membre.
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import type { TeamSummary } from '../../queries/useTeams.ts'
import { TeamEmblem } from '../shared/TeamEmblem.tsx'

export function TeamCard({ team }: { team: TeamSummary }) {
  return (
    // `block w-full` : même piège que CollectionCard.tsx — un lien est
    // shrink-to-fit par défaut, or la grille ci-dessous n'a aucune colonne
    // qui lui donnerait spontanément une largeur. Sans ça la ligne se replie
    // sur son contenu minimal au lieu de courir sur toute la largeur.
    <Link
      to="/team/$id"
      params={{ id: team.id }}
      className="group grid w-full grid-cols-[56px_1fr_200px_auto] items-center gap-5 rounded-[20px] border-[1.5px] border-border bg-card px-5 py-[18px] shadow-[0_2px_0_rgba(27,23,38,0.03),0_14px_30px_-22px_rgba(27,23,38,0.2)] transition-[transform,border-color,box-shadow] duration-[.25s] hover:-translate-y-[3px] hover:border-primary/40 hover:shadow-[0_2px_0_rgba(245,158,11,0.1),0_20px_38px_-22px_rgba(245,158,11,0.5)]"
    >
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
          <span>{team.myRoleLabel}</span>
        </div>
      </div>

      <div className="min-w-0">
        {team.raid ? (
          <>
            <div className="mb-[5px] flex justify-between gap-3 font-mono text-[10px] text-text-light">
              <span className="truncate">{team.raid.bossName}</span>
              <span className="shrink-0">{team.raid.pct} %</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-[4px] bg-foreground/7">
              <div
                className="h-full rounded-[4px] bg-gradient-to-r from-primary to-destructive"
                style={{ width: `${team.raid.pct}%` }}
              />
            </div>
          </>
        ) : (
          <p className="font-mono text-[10px] text-text-light/60">
            Aucun raid en cours
          </p>
        )}
      </div>

      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-text-light/40 transition-colors group-hover:text-text-light" />
    </Link>
  )
}
