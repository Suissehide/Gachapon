import type { JoinRequestStatus } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  IJoinRequestRepository,
  JoinRequestRow,
  JoinRequestWithTeam,
  JoinRequestWithTeamAndUser,
  JoinRequestWithUser,
} from '../../../types/infra/orm/repositories/join-request.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const CANDIDATE_SELECT = {
  select: { id: true, username: true, avatar: true },
} as const

const TEAM_SELECT = {
  select: { id: true, name: true, slug: true, hue: true },
} as const

export class JoinRequestRepository implements IJoinRequestRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<JoinRequestRow | null> {
    return this.#prisma.joinRequest.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
  }

  findById(id: string): Promise<JoinRequestWithTeamAndUser | null> {
    return this.#prisma.joinRequest.findUnique({
      where: { id },
      include: { team: TEAM_SELECT, user: CANDIDATE_SELECT },
    }) as unknown as Promise<JoinRequestWithTeamAndUser | null>
  }

  /**
   * Une ligne par couple (équipe, joueur) : recandidater réécrit la ligne et
   * efface la décision précédente. C'est `@@unique([teamId, userId])` qui
   * rend l'opération atomique — pas de vérification applicative en amont.
   */
  upsertPending(data: {
    teamId: string
    userId: string
    expiresAt: Date
  }): Promise<JoinRequestRow> {
    return this.#prisma.joinRequest.upsert({
      where: { teamId_userId: { teamId: data.teamId, userId: data.userId } },
      create: data,
      update: {
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: data.expiresAt,
        decidedById: null,
        decidedAt: null,
      },
    })
  }

  listByUser(userId: string): Promise<JoinRequestWithTeam[]> {
    return this.#prisma.joinRequest.findMany({
      where: { userId },
      include: { team: TEAM_SELECT },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<JoinRequestWithTeam[]>
  }

  listPendingByTeam(teamId: string): Promise<JoinRequestWithUser[]> {
    return this.#prisma.joinRequest.findMany({
      where: { teamId, status: 'PENDING' },
      include: { user: CANDIDATE_SELECT },
      orderBy: { createdAt: 'asc' },
    }) as unknown as Promise<JoinRequestWithUser[]>
  }

  decideIfPending(
    tx: PrimaTransactionClient,
    id: string,
    status: 'ACCEPTED' | 'DECLINED',
    decidedById: string,
    now: Date,
  ): Promise<number> {
    return tx.joinRequest
      .updateMany({
        where: { id, status: 'PENDING' },
        data: { status, decidedById, decidedAt: now },
      })
      .then((res) => res.count)
  }

  setStatus(id: string, status: JoinRequestStatus): Promise<void> {
    return this.#prisma.joinRequest
      .update({ where: { id }, data: { status } })
      .then(() => undefined)
  }

  markExpired(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return Promise.resolve()
    }
    return this.#prisma.joinRequest
      .updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      })
      .then(() => undefined)
  }
}
