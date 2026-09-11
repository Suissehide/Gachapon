import type { JoinRequestStatus } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  DirectoryRow,
  IJoinRequestRepository,
  JoinRequestRow,
  JoinRequestWithTeam,
  JoinRequestWithTeamAndUser,
  JoinRequestWithUser,
} from '../../../types/infra/orm/repositories/join-request.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const CANDIDATE_SELECT = {
  select: { id: true, username: true, avatar: true, level: true },
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
    return upsertPendingWith(this.#prisma, data)
  }

  upsertPendingInTx(
    tx: PrimaTransactionClient,
    data: { teamId: string; userId: string; expiresAt: Date },
  ): Promise<JoinRequestRow> {
    return upsertPendingWith(tx, data)
  }

  listByUser(userId: string): Promise<JoinRequestWithTeam[]> {
    return listByUserWith(this.#prisma, userId)
  }

  listByUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<JoinRequestWithTeam[]> {
    return listByUserWith(tx, userId)
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

  /**
   * Tri par ACTIVITÉ de la semaine, pas par niveau : un nouveau cherche une
   * équipe vivante, pas une équipe forte, et trier par puissance recréerait
   * l'entonnoir du classement. `_count.weeklies` s'appuie sur l'index
   * `@@index([teamId, weekKey])` déjà en place.
   *
   * `id` en dernier critère : sans lui la pagination par curseur n'est pas
   * déterministe entre deux équipes à égalité.
   *
   * Note d'implémentation : Prisma ne sait pas trier sur un `_count`
   * filtré. Le tri par activité se fait donc EN MÉMOIRE, après la requête,
   * sur la page récupérée — ce qui suffit tant que l'annuaire tient en
   * quelques dizaines d'équipes. Trier par `level` en SQL garde la
   * pagination stable ; le classement final applique `activeThisWeek`
   * décroissant puis `level` décroissant (`RecruitmentDomain#listDirectory`).
   * Si l'annuaire dépasse quelques centaines d'équipes, il faudra une vue
   * matérialisée — hors périmètre aujourd'hui.
   */
  listDirectory(params: {
    excludeTeamIds: string[]
    weekKey: string
    search?: string
    cursor?: string
    limit: number
  }): Promise<DirectoryRow[]> {
    return this.#prisma.team.findMany({
      where: {
        recruiting: true,
        id: { notIn: params.excludeTeamIds },
        ...(params.search
          ? { name: { contains: params.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        _count: {
          select: {
            members: true,
            weeklies: { where: { weekKey: params.weekKey } },
          },
        },
      },
      orderBy: [{ level: 'desc' }, { id: 'asc' }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    }) as unknown as Promise<DirectoryRow[]>
  }
}

/**
 * Corps partagé par `upsertPending` et `upsertPendingInTx` : même motif que
 * `WagerRepository#listActiveDuelsForUser` / `…InTx`, qui délèguent toutes
 * deux à une fonction de module paramétrée par le client. Un seul endroit
 * pour la charge utile de l'upsert — la version transactionnelle ne peut pas
 * diverger de la version simple.
 */
function upsertPendingWith(
  client: PostgresPrismaClient | PrimaTransactionClient,
  data: { teamId: string; userId: string; expiresAt: Date },
): Promise<JoinRequestRow> {
  return client.joinRequest.upsert({
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

/** Même motif que `upsertPendingWith` ci-dessus, pour `listByUser`/`…InTx`. */
function listByUserWith(
  client: PostgresPrismaClient | PrimaTransactionClient,
  userId: string,
): Promise<JoinRequestWithTeam[]> {
  return client.joinRequest.findMany({
    where: { userId },
    include: { team: TEAM_SELECT },
    orderBy: { createdAt: 'desc' },
  }) as unknown as Promise<JoinRequestWithTeam[]>
}
