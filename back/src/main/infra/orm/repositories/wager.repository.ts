import type {
  Bet,
  CardRarity,
  Duel,
  DuelTransfer,
} from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  BetWithParties,
  DuelWithParties,
  IWagerRepository,
  PullWithRarity,
} from '../../../types/infra/orm/repositories/wager.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const PARTY_SELECT = { id: true, username: true, avatar: true } as const

export class WagerRepository implements IWagerRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findPullsSince(
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]> {
    return findPullsSinceWith(this.#prisma, userId, since, take)
  }

  findPullsSinceInTx(
    tx: PrimaTransactionClient,
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]> {
    return findPullsSinceWith(tx, userId, since, take)
  }

  findOpenDuelForUser(userId: string): Promise<Duel | null> {
    return this.#prisma.duel.findFirst({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [{ challengerId: userId }, { opponentId: userId }],
      },
    })
  }

  findDuelById(id: string): Promise<DuelWithParties | null> {
    return this.#prisma.duel.findUnique({
      where: { id },
      include: {
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
      },
    })
  }

  listTeamDuels(teamId: string): Promise<DuelWithParties[]> {
    return this.#prisma.duel.findMany({
      where: { teamId },
      include: {
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  listRecentSettledDuels(
    teamId: string,
    take: number,
  ): Promise<DuelWithParties[]> {
    return this.#prisma.duel.findMany({
      where: { teamId, status: 'SETTLED' },
      include: {
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
      },
      orderBy: { settledAt: 'desc' },
      take,
    })
  }

  listActiveDuelsForUser(userId: string): Promise<Duel[]> {
    return this.#prisma.duel.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ challengerId: userId }, { opponentId: userId }],
      },
    })
  }

  createDuel(data: {
    teamId: string
    challengerId: string
    opponentId: string
    pullCount: number
  }): Promise<Duel> {
    return this.#prisma.duel.create({ data })
  }

  listTransfers(duelId: string): Promise<DuelTransfer[]> {
    return this.#prisma.duelTransfer.findMany({
      where: { duelId },
      orderBy: { createdAt: 'asc' },
    })
  }

  listTeamBets(teamId: string): Promise<BetWithParties[]> {
    return this.#prisma.bet.findMany({
      where: { teamId },
      include: {
        bettor: { select: PARTY_SELECT },
        target: { select: PARTY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  listRecentSettledBets(
    teamId: string,
    take: number,
  ): Promise<BetWithParties[]> {
    return this.#prisma.bet.findMany({
      where: { teamId, status: { in: ['WON', 'LOST'] } },
      include: {
        bettor: { select: PARTY_SELECT },
        target: { select: PARTY_SELECT },
      },
      orderBy: { settledAt: 'desc' },
      take,
    })
  }

  listActiveBetsForTarget(targetId: string): Promise<Bet[]> {
    return this.#prisma.bet.findMany({
      where: { targetId, status: 'ACTIVE' },
    })
  }

  countOpenBetsByBettor(bettorId: string): Promise<number> {
    return this.#prisma.bet.count({ where: { bettorId, status: 'ACTIVE' } })
  }

  countOpenBetsOnTarget(targetId: string): Promise<number> {
    return this.#prisma.bet.count({ where: { targetId, status: 'ACTIVE' } })
  }

  createBet(data: {
    teamId: string
    bettorId: string
    targetId: string
    stake: number
    minRarity: CardRarity
    pullWindow: number
    multiplier: number
    deadlineAt: Date
  }): Promise<Bet> {
    return this.#prisma.bet.create({ data })
  }

  // Le repository n'a pas accès à la config (délai d'acceptation d'un duel
  // PENDING) : il ne renvoie donc que ce qui est objectivement périmé, à
  // savoir les duels ACTIVE et paris ACTIVE dont `deadlineAt` est dépassée.
  // Les duels PENDING trop vieux (délai d'acceptation, en config) restent à
  // la charge du domaine, qui seul connaît cette valeur.
  async listStaleForTeam(
    teamId: string,
    now: Date,
  ): Promise<{ duelIds: string[]; betIds: string[] }> {
    const [staleDuels, staleBets] = await Promise.all([
      this.#prisma.duel.findMany({
        where: { teamId, status: 'ACTIVE', deadlineAt: { lt: now } },
        select: { id: true },
      }),
      this.#prisma.bet.findMany({
        where: { teamId, status: 'ACTIVE', deadlineAt: { lt: now } },
        select: { id: true },
      }),
    ])
    return {
      duelIds: staleDuels.map((d) => d.id),
      betIds: staleBets.map((b) => b.id),
    }
  }
}

function findPullsSinceWith(
  client: PostgresPrismaClient | PrimaTransactionClient,
  userId: string,
  since: Date,
  take: number,
): Promise<PullWithRarity[]> {
  return client.gachaPull
    .findMany({
      where: { userId, pulledAt: { gt: since } },
      select: {
        cardId: true,
        variant: true,
        pulledAt: true,
        card: { select: { rarity: true } },
      },
      // `pulledAt` est en précision milliseconde : deux tirages d'un même
      // batch peuvent tomber sur le même instant. `id` en second tri rend
      // l'ordre — et donc le sous-ensemble des `take` premiers — déterministe,
      // ce qui compte ici puisque c'est lui qui décide quelles cartes sont
      // saisissables au règlement du duel.
      orderBy: [{ pulledAt: 'asc' }, { id: 'asc' }],
      take,
    })
    .then((pulls) =>
      pulls.map((p) => ({
        cardId: p.cardId,
        variant: p.variant,
        rarity: p.card.rarity,
        pulledAt: p.pulledAt,
      })),
    )
}
