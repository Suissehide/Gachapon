import type {
  JoinRequest,
  JoinRequestStatus,
} from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type JoinRequestRow = JoinRequest

type CandidateSelection = {
  id: string
  username: string
  avatar: string | null
  level: number
}

export type JoinRequestWithUser = JoinRequestRow & {
  user: CandidateSelection
}

export type JoinRequestWithTeam = JoinRequestRow & {
  team: { id: string; name: string; slug: string; hue: number | null }
}

export type JoinRequestWithTeamAndUser = JoinRequestWithTeam &
  JoinRequestWithUser

/** Une ligne de l'annuaire des équipes qui recrutent. */
export type DirectoryRow = {
  id: string
  name: string
  slug: string
  motto: string | null
  hue: number | null
  level: number
  _count: { members: number; weeklies: number }
}

export interface IJoinRequestRepository {
  findByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<JoinRequestRow | null>
  findById(id: string): Promise<JoinRequestWithTeamAndUser | null>
  upsertPending(data: {
    teamId: string
    userId: string
    expiresAt: Date
  }): Promise<JoinRequestRow>
  /**
   * Même écriture que `upsertPending`, mais dans la transaction sérialisable
   * de l'appelant : `RecruitmentDomain#apply` doit relire le plafond de 5 ET
   * écrire dans le même tour, sous peine de laisser deux candidatures
   * concurrentes passer toutes les deux le compteur.
   */
  upsertPendingInTx(
    tx: PrimaTransactionClient,
    data: { teamId: string; userId: string; expiresAt: Date },
  ): Promise<JoinRequestRow>
  listByUser(userId: string): Promise<JoinRequestWithTeam[]>
  listByUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<JoinRequestWithTeam[]>
  listPendingByTeam(teamId: string): Promise<JoinRequestWithUser[]>
  /**
   * Transition gardée : le `where` exige `status: 'PENDING'`, donc deux
   * officiers qui cliquent en même temps produisent un gagnant et un
   * perdant qui touche zéro ligne. Renvoie le nombre de lignes modifiées.
   */
  decideIfPending(
    tx: PrimaTransactionClient,
    id: string,
    status: 'ACCEPTED' | 'DECLINED',
    decidedById: string,
    now: Date,
  ): Promise<number>
  setStatus(id: string, status: JoinRequestStatus): Promise<void>
  /**
   * Même garde que `decideIfPending`, pour les transitions qui ne portent
   * pas de décision (`EXPIRED` depuis le plafond de 3 équipes, `CANCELLED`
   * depuis une annulation) : sans le `status: 'PENDING'` dans le `where`,
   * une expiration ou une annulation qui court-circuite un `accept`
   * concurrent écraserait un `ACCEPTED` tout frais. Renvoie le nombre de
   * lignes modifiées.
   */
  setStatusIfPending(
    id: string,
    status: 'EXPIRED' | 'CANCELLED',
  ): Promise<number>
  markExpired(ids: string[]): Promise<void>
  /**
   * Tri par `level` en SQL (pagination stable), `id` en tie-break. Le
   * classement final par activité de la semaine se fait en mémoire côté
   * domaine — voir la note sur `listDirectory` du repository.
   */
  listDirectory(params: {
    excludeTeamIds: string[]
    weekKey: string
    search?: string
    cursor?: string
    limit: number
  }): Promise<DirectoryRow[]>
}
