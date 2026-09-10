// TeamIdentityCard — tête du rail gauche de la fiche d'équipe. Reprend
// `docs/design_handoff_equipe/equipe.css` (`.tmB-idcard` et enfants) :
// emblème 72 px centré, nom 30 px, devise, anneau d'XP 132 px, quatre
// tuiles de faits en 2×2, puis la rangée d'actions.
//
// L'emblème est rendu SANS `hue` : le handoff distingue deux traitements
// (`.tm-emblem--flat`, teinté par la hue serveur, pour la carte de liste ;
// `.tm-emblem`, dégradé héros fixe, pour cette carte-ci). `TeamEmblem`
// expose exactement ce choix par la présence ou l'absence de `hue` — c'est
// pour cette carte que l'option existe.
import { Link } from '@tanstack/react-router'
import { Settings, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'

import type { TeamDetail } from '../../api/teamProgression.api.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { ProgressRing } from '../shared/ProgressRing.tsx'
import { StatTile } from '../shared/StatTile.tsx'
import { TeamEmblem } from '../shared/TeamEmblem.tsx'
import { Button } from '../ui/button.tsx'
import { PopupTrigger } from '../ui/popup.tsx'
import { InviteMemberPopup } from './InviteMemberPopup.tsx'

const fr = (n: number) => n.toLocaleString('fr-FR')

type TeamIdentityCardProps = {
  team: TeamDetail
  /** Chef ou officier : le seul rôle qui peut inviter. */
  canManage: boolean
  /** Chef : la page de réglages est fermée aux officiers côté route. */
  isOwner: boolean
  /** Rôle du lecteur, requis par `InviteMemberPopup`. */
  myRole: 'OWNER' | 'ADMIN' | 'MEMBER' | undefined
  /** Action secondaire de pied de carte (« Quitter l'équipe »). */
  footer?: ReactNode
}

export function TeamIdentityCard({
  team,
  canManage,
  isOwner,
  myRole,
  footer,
}: TeamIdentityCardProps) {
  return (
    <ArcadeCard className="text-center">
      <TeamEmblem
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

      {/* `xp` est l'XP acquise DANS le niveau courant et `xpNext` le seuil de
          ce niveau (jamais le reliquat) : le rapport est directement la
          fraction de l'anneau. Une équipe à 0 XP rend un anneau vide, et une
          équipe au niveau maximum reste à 0 XP côté serveur — l'anneau se
          vide, il ne déborde pas. `ProgressRing` borne de toute façon la
          fraction entre 0 et 1. */}
      <ProgressRing
        className="mx-auto mt-[18px]"
        value={team.xp}
        max={team.xpNext}
        label={team.level}
        sublabel="NIVEAU"
      />
      <p className="mt-2 font-mono text-[10px] tracking-[0.06em] text-foreground/50">
        {fr(team.xp)} / {fr(team.xpNext)} XP
      </p>

      <div className="mt-[18px] grid grid-cols-2 gap-2.5">
        <StatTile
          value={
            <>
              {team.memberCount}
              <span className="text-foreground/40">/{team.maxMembers}</span>
            </>
          }
          label="MEMBRES"
        />
        <StatTile
          // `rankGlobal` est nul tant que l'équipe n'est pas classée : un tiret
          // plutôt qu'un « #0 » qui se lirait comme une place réelle.
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
          label="CLASSEMENT"
        />
        <StatTile value={fr(team.weekPts)} label="PTS HEBDO" />
        <StatTile value={fr(team.raidsWon)} label="RAIDS VAINCUS" />
      </div>

      {(canManage || isOwner) && (
        <div className="mt-[18px] flex items-center gap-2">
          {canManage && myRole && (
            <InviteMemberPopup
              teamId={team.id}
              userRole={myRole}
              // Un `Button` nu ne déclencherait rien : c'est `PopupTrigger`
              // (Dialog.Trigger stylé par `buttonVariants`) qui ouvre la
              // modale — même montage que les emplacements libres de
              // « Mes équipes ». `h-auto w-full` parce qu'un déclencheur est
              // shrink-to-fit par défaut et que `flex-1` seul ne lui donne
              // aucune base de largeur (piège de CollectionCard.tsx).
              trigger={
                <PopupTrigger
                  variant="secondary"
                  className="h-auto w-full flex-1 gap-2 rounded-xl border-[1.5px] py-[11px] text-sm font-bold"
                >
                  <UserPlus className="h-4 w-4" />
                  Inviter
                </PopupTrigger>
              }
            />
          )}
          {/* Réglages réservés au chef, pas aux officiers comme le suggère la
              maquette : la route /team/$id/settings refuse déjà tout autre
              rôle, un bouton visible pour un officier mènerait à un mur. */}
          {isOwner && (
            <Button
              variant="secondary"
              asChild
              title="Réglages de l'équipe"
              className="h-auto shrink-0 rounded-xl border-[1.5px] p-[11px]"
            >
              <Link to="/team/$id/settings" params={{ id: team.id }}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Réglages de l'équipe</span>
              </Link>
            </Button>
          )}
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </ArcadeCard>
  )
}
