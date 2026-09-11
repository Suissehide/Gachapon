import type { Bet, BetStatus, Duel } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  ActiveBetOnTarget,
  BetWithParties,
  CountedPullWithCard,
  DuelTransferWithCard,
  DuelWithParties,
  IWagerRepository,
  PendingDuelForOpponent,
  PullWithRarity,
  SettledDuelForUser,
} from '../../../types/infra/orm/repositories/wager.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const PARTY_SELECT = { id: true, username: true, avatar: true } as const
const TEAM_SELECT = {
  id: true,
  name: true,
  slug: true,
  avatar: true,
} as const

export class WagerRepository implements IWagerRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findPullsSinceInTx(
    tx: PrimaTransactionClient,
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]> {
    return findPullsSinceWith(tx, userId, since, take)
  }

  findOpenDuelForUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Duel | null> {
    return findOpenDuelForUserWith(tx, userId)
  }

  findDuelById(id: string): Promise<DuelWithParties | null> {
    return this.#prisma.duel.findUnique({
      where: { id },
      include: {
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
        _count: { select: { transfers: true } },
      },
    })
  }

  listPendingDuelsForOpponent(
    userId: string,
    createdAfter: Date,
  ): Promise<PendingDuelForOpponent[]> {
    return this.#prisma.duel.findMany({
      where: {
        opponentId: userId,
        status: 'PENDING',
        createdAt: { gt: createdAfter },
      },
      include: {
        team: { select: TEAM_SELECT },
        challenger: { select: PARTY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  listTeamDuels(teamId: string): Promise<DuelWithParties[]> {
    return this.#prisma.duel.findMany({
      where: { teamId },
      include: {
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
        _count: { select: { transfers: true } },
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
        _count: { select: { transfers: true } },
      },
      orderBy: { settledAt: 'desc' },
      take,
    })
  }

  listDuelTransfers(duelId: string): Promise<DuelTransferWithCard[]> {
    return this.#prisma.duelTransfer.findMany({
      where: { duelId },
      select: {
        id: true,
        variant: true,
        fromUserId: true,
        toUserId: true,
        card: {
          select: {
            id: true,
            name: true,
            rarity: true,
            element: true,
            imageUrl: true,
            set: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  listActiveDuelsForUser(userId: string): Promise<Duel[]> {
    return listActiveDuelsForUserWith(this.#prisma, userId)
  }

  listActiveDuelsForUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Duel[]> {
    return listActiveDuelsForUserWith(tx, userId)
  }

  createDuelInTx(
    tx: PrimaTransactionClient,
    data: {
      teamId: string
      challengerId: string
      opponentId: string
      pullCount: number
    },
  ): Promise<Duel> {
    return tx.duel.create({ data })
  }

  findCountedPullsWithCard(
    userId: string,
    since: Date,
    take: number,
  ): Promise<CountedPullWithCard[]> {
    return this.#prisma.gachaPull
      .findMany({
        ...countedPullsWindow(userId, since, take),
        select: {
          id: true,
          cardId: true,
          variant: true,
          pulledAt: true,
          card: {
            select: {
              name: true,
              rarity: true,
              element: true,
              imageUrl: true,
              set: { select: { name: true } },
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          cardId: row.cardId,
          name: row.card.name,
          setName: row.card.set?.name ?? '',
          rarity: row.card.rarity,
          element: row.card.element,
          imageKey: row.card.imageUrl,
          variant: row.variant,
          pulledAt: row.pulledAt,
        })),
      )
  }

  listRecentSettledDuelsForUser(
    userId: string,
    settledAfter: Date,
  ): Promise<SettledDuelForUser[]> {
    return this.#prisma.duel.findMany({
      where: {
        status: 'SETTLED',
        settledAt: { gt: settledAfter },
        OR: [{ challengerId: userId }, { opponentId: userId }],
      },
      include: {
        team: { select: TEAM_SELECT },
        challenger: { select: PARTY_SELECT },
        opponent: { select: PARTY_SELECT },
      },
      orderBy: { settledAt: 'desc' },
    })
  }

  listActiveBetsOnTarget(
    userId: string,
    deadlineAfter: Date,
  ): Promise<ActiveBetOnTarget[]> {
    return this.#prisma.bet.findMany({
      where: {
        targetId: userId,
        status: 'ACTIVE',
        deadlineAt: { gt: deadlineAfter },
      },
      include: {
        team: { select: TEAM_SELECT },
        bettor: { select: PARTY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  listTeamBets(
    teamId: string,
    statuses?: BetStatus[],
  ): Promise<BetWithParties[]> {
    return this.#prisma.bet.findMany({
      where: { teamId, ...(statuses ? { status: { in: statuses } } : {}) },
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
      // EXPIRED compris : un pari expiré est un pari REMBOURSÉ, le parieur
      // doit pouvoir le constater plutôt que de le voir disparaître.
      where: { teamId, status: { in: ['WON', 'LOST', 'EXPIRED'] } },
      include: {
        bettor: { select: PARTY_SELECT },
        target: { select: PARTY_SELECT },
      },
      orderBy: { settledAt: 'desc' },
      take,
    })
  }

  findBetById(id: string): Promise<Bet | null> {
    return this.#prisma.bet.findUnique({ where: { id } })
  }

  listActiveBetsForTarget(targetId: string): Promise<Bet[]> {
    return this.#prisma.bet.findMany({
      where: { targetId, status: 'ACTIVE' },
    })
  }

  countOpenBetsByBettorInTx(
    tx: PrimaTransactionClient,
    bettorId: string,
  ): Promise<number> {
    return tx.bet.count({ where: { bettorId, status: 'ACTIVE' } })
  }

  countOpenBetsOnTargetInTx(
    tx: PrimaTransactionClient,
    targetId: string,
  ): Promise<number> {
    return tx.bet.count({ where: { targetId, status: 'ACTIVE' } })
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

function findOpenDuelForUserWith(
  client: PrimaTransactionClient,
  userId: string,
): Promise<Duel | null> {
  return client.duel.findFirst({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  })
}

function listActiveDuelsForUserWith(
  client: PostgresPrismaClient | PrimaTransactionClient,
  userId: string,
): Promise<Duel[]> {
  return client.duel.findMany({
    where: {
      status: 'ACTIVE',
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  })
}

/**
 * La fenêtre de tirages comptés d'un duel : `where`, tri et `take`. Extraite
 * parce que DEUX lectures s'en servent — celle du règlement
 * (`findPullsSinceWith`) et celle de l'écran de résultat
 * (`findCountedPullsWithCard`). Si elles divergeaient, l'écran montrerait une
 * main qui n'est pas celle qui a produit le score.
 *
 * `pulledAt` est en précision milliseconde : deux tirages d'un même batch
 * peuvent tomber sur le même instant. `id` en second tri rend l'ordre — et
 * donc le sous-ensemble des `take` premiers — déterministe, ce qui compte
 * puisque c'est lui qui décide quelles cartes sont saisissables au règlement.
 */
function countedPullsWindow(userId: string, since: Date, take: number) {
  return {
    where: { userId, pulledAt: { gt: since } },
    orderBy: [{ pulledAt: 'asc' as const }, { id: 'asc' as const }],
    take,
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
      ...countedPullsWindow(userId, since, take),
      select: {
        cardId: true,
        variant: true,
        pulledAt: true,
        card: { select: { rarity: true } },
      },
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
