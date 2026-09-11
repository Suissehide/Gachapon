import type { PrimaTransactionClient } from '../../infra/orm/client'

export type MyJoinRequestView = {
  id: string
  teamId: string
  teamName: string
  teamSlug: string
  hue: number
  status: 'PENDING' | 'DECLINED' | 'ACCEPTED'
  createdAt: Date
  expiresAt: Date
  /** Renseigné seulement sur un refus dont le cooldown court encore. */
  reapplyAt: Date | null
  /** Renseigné sur une décision : c'est ce que la cloche affiche. */
  decidedAt: Date | null
}

export type TeamJoinRequestView = {
  id: string
  createdAt: Date
  candidate: { id: string; username: string; avatar: string | null }
}

/** Une entrée de l'annuaire des équipes qui recrutent. */
export type DirectoryEntryView = {
  id: string
  name: string
  slug: string
  motto: string | null
  hue: number
  level: number
  memberCount: number
  maxMembers: number
  /** Nombre de membres ayant marqué au moins un point cette semaine. */
  activeThisWeek: number
  /** Le lecteur a déjà une candidature EN ATTENTE pour cette équipe. */
  hasPendingRequest: boolean
}

export interface IRecruitmentDomain {
  apply(teamId: string, userId: string): Promise<MyJoinRequestView>
  cancel(teamId: string, userId: string): Promise<void>
  listMine(userId: string): Promise<MyJoinRequestView[]>
  listForTeam(teamId: string, actorId: string): Promise<TeamJoinRequestView[]>
  accept(
    requestId: string,
    actorId: string,
  ): Promise<{ teamId: string; userId: string; teamName: string }>
  decline(
    requestId: string,
    actorId: string,
  ): Promise<{ teamId: string; userId: string; teamName: string }>
  closeForMember(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
  ): Promise<void>
  listDirectory(
    userId: string,
    opts: { cursor?: string; search?: string },
  ): Promise<{ teams: DirectoryEntryView[]; nextCursor: string | null }>
}
