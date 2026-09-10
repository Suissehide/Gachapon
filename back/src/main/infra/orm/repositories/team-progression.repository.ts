import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  ITeamProgressionRepository,
  TeamPerkRow,
  TeamProgressRow,
  TeamWeeklyRow,
} from '../../../types/infra/orm/repositories/team-progression.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

type AnyClient = PostgresPrismaClient | PrimaTransactionClient

/**
 * Une seule requête partagée par la variante transactionnelle et la
 * variante libre, sur le modèle de `findPullsSinceWith` dans
 * `wager.repository.ts` : deux corps divergeraient au premier changement.
 */
function listPerksWith(
  client: AnyClient,
  teamId: string,
): Promise<TeamPerkRow[]> {
  return client.teamPerk.findMany({
    where: { teamId },
    select: { key: true, rank: true },
    orderBy: { key: 'asc' },
  })
}

export class TeamProgressionRepository implements ITeamProgressionRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async listTeamIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.#prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    })
    return rows.map((row) => row.teamId)
  }

  async listMemberIdsForTeam(teamId: string): Promise<string[]> {
    const rows = await this.#prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    })
    return rows.map((row) => row.userId)
  }

  async isMemberInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await tx.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { userId: true },
    })
    return member !== null
  }

  async addWeeklyPointsInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
    weekKey: string,
    points: number,
  ): Promise<number> {
    const row = await tx.teamMemberWeekly.upsert({
      where: { teamId_userId_weekKey: { teamId, userId, weekKey } },
      create: { teamId, userId, weekKey, points },
      update: { points: { increment: points } },
      select: { points: true },
    })
    return row.points
  }

  findProgress(teamId: string): Promise<TeamProgressRow | null> {
    return this.#prisma.team.findUnique({
      where: { id: teamId },
      select: { level: true, xp: true, perkPoints: true },
    })
  }

  findProgressInTx(
    tx: PrimaTransactionClient,
    teamId: string,
  ): Promise<TeamProgressRow | null> {
    return tx.team.findUnique({
      where: { id: teamId },
      select: { level: true, xp: true, perkPoints: true },
    })
  }

  writeProgressInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    progress: TeamProgressRow,
  ): Promise<void> {
    return tx.team
      .update({
        where: { id: teamId },
        data: {
          level: progress.level,
          xp: progress.xp,
          perkPoints: progress.perkPoints,
        },
      })
      .then(() => undefined)
  }

  listPerks(teamId: string): Promise<TeamPerkRow[]> {
    return listPerksWith(this.#prisma, teamId)
  }

  listPerksInTx(
    tx: PrimaTransactionClient,
    teamId: string,
  ): Promise<TeamPerkRow[]> {
    return listPerksWith(tx, teamId)
  }

  upsertPerkRankInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    key: string,
    rank: number,
  ): Promise<void> {
    return tx.teamPerk
      .upsert({
        where: { teamId_key: { teamId, key } },
        create: { teamId, key, rank },
        update: { rank },
      })
      .then(() => undefined)
  }

  resetPerksInTx(tx: PrimaTransactionClient, teamId: string): Promise<void> {
    return tx.teamPerk
      .updateMany({ where: { teamId }, data: { rank: 0 } })
      .then(() => undefined)
  }

  async sumWeeklyPoints(teamId: string, weekKey: string): Promise<number> {
    const aggregate = await this.#prisma.teamMemberWeekly.aggregate({
      where: { teamId, weekKey },
      _sum: { points: true },
    })
    return aggregate._sum.points ?? 0
  }

  listWeeklyPoints(teamId: string, weekKey: string): Promise<TeamWeeklyRow[]> {
    return this.#prisma.teamMemberWeekly.findMany({
      where: { teamId, weekKey },
      select: { userId: true, points: true },
      orderBy: { points: 'desc' },
    })
  }

  /**
   * UNE requête, et c'est un contrat : `effectsForUser` est lue sur des
   * chemins chauds (régénération de jetons, aperçu des récompenses de
   * campagne). `MAX` et pas `SUM` — trois équipes ne cumulent pas leurs
   * bonus, le joueur prend le meilleur rang de chacun.
   *
   * Indexée des deux côtés : `TeamMember` porte `@@index([userId])`,
   * `TeamPerk` porte `@@unique([teamId, key])` dont `teamId` est la colonne
   * de tête.
   */
  bestPerkRanksForUser(userId: string): Promise<TeamPerkRow[]> {
    return this.#prisma.$queryRaw<TeamPerkRow[]>`
      SELECT p."key" AS "key", MAX(p."rank")::int AS "rank"
      FROM "TeamMember" m
      JOIN "TeamPerk" p ON p."teamId" = m."teamId"
      WHERE m."userId" = ${userId}
      GROUP BY p."key"
    `
  }
}
