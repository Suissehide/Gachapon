import type {
  CardElement,
  Prisma,
  TeamRaid,
} from '../../../../generated/client'
import {
  raidTierLabelEn,
  raidTierLabelFr,
} from '../../../domain/content/raid.definitions'
import { raidTierRewardAtLevel } from '../../../domain/raid/raid-rules'
import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedRaidBoss } from '../../../types/infra/orm/localized'
import type {
  IRaidRepository,
  RaidContributionRow,
  RaidTierRewardPatch,
  RaidTierWithReward,
  TeamRaidWithBoss,
} from '../../../types/infra/orm/repositories/raid.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class RaidRepository implements IRaidRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  listBosses(): Promise<LocalizedRaidBoss[]> {
    return this.#prisma.raidBoss.findMany({ orderBy: { element: 'asc' } })
  }

  findBossByElement(element: CardElement): Promise<LocalizedRaidBoss | null> {
    return this.#prisma.raidBoss.findUnique({ where: { element } })
  }

  updateBoss(
    element: CardElement,
    data: {
      nameFr?: string
      nameEn?: string
      spec?: Prisma.InputJsonValue
    },
  ): Promise<LocalizedRaidBoss> {
    return this.#prisma.raidBoss.update({ where: { element }, data })
  }

  listTiers(level = 0): Promise<RaidTierWithReward[]> {
    return this.#prisma.raidTier.findMany({
      where: { level },
      include: { reward: true },
      orderBy: { pct: 'asc' },
    })
  }

  /**
   * Paliers du niveau `level`, créés à la demande depuis le niveau 0 (la
   * ligne de référence, seule éditée en admin). Partagés par toutes les
   * équipes : quatre lignes par niveau, pas par raid.
   *
   * À n'appeler QUE hors transaction. Une création de `Reward` dans la
   * transaction Serializable de l'attaque produirait un `P2002` quand deux
   * coéquipiers attaquent en même temps, et `retryOnSerialization` ne
   * rattrape que `P2034`. Ici, `skipDuplicates` absorbe la course — la
   * collision oppose deux ÉQUIPES atteignant le niveau N pour la première
   * fois en même temps (les lignes sont partagées par toutes les équipes,
   * pas propres à un raid), et coûte jusqu'à 4 lignes `Reward` orphelines
   * par équipe perdante, sans conséquence : `missing.length === 0`
   * court-circuite tous les appels suivants sur ce niveau.
   */
  async ensureTiersForLevel(
    level: number,
    bonusPct: number,
  ): Promise<RaidTierWithReward[]> {
    if (level <= 0) {
      return this.listTiers(0)
    }
    const [base, existing] = await Promise.all([
      this.listTiers(0),
      this.listTiers(level),
    ])
    const missing = base.filter((b) => !existing.some((e) => e.pct === b.pct))
    if (missing.length === 0) {
      return existing
    }
    for (const tier of missing) {
      const amounts = raidTierRewardAtLevel(tier.reward, level, bonusPct)
      const reward = await this.#prisma.reward.create({
        data: {
          ...amounts,
          xp: tier.reward.xp,
          cardRarity: tier.reward.cardRarity,
          labelFr: `${raidTierLabelFr(tier.pct)} (niv. ${level})`,
          labelEn: `${raidTierLabelEn(tier.pct)} (level ${level})`,
        },
      })
      await this.#prisma.raidTier.createMany({
        data: [{ pct: tier.pct, level, rewardId: reward.id }],
        skipDuplicates: true,
      })
    }
    return this.listTiers(level)
  }

  findTierByPct(pct: number): Promise<RaidTierWithReward | null> {
    return this.#prisma.raidTier.findUnique({
      where: { pct_level: { pct, level: 0 } },
      include: { reward: true },
    })
  }

  async updateTierReward(
    pct: number,
    data: RaidTierRewardPatch,
  ): Promise<RaidTierWithReward> {
    const tier = await this.#prisma.raidTier.findUniqueOrThrow({
      where: { pct_level: { pct, level: 0 } },
    })
    await this.#prisma.reward.update({ where: { id: tier.rewardId }, data })
    // Les niveaux > 0 sont dérivés du niveau 0 : ils sont désormais périmés.
    // On supprime les LIGNES de palier, jamais les `Reward` — ceux-là sont
    // pointés par des `UserReward` déjà distribués, et un lot distribué est
    // de l'historique. Les niveaux se régénèrent au prochain franchissement.
    await this.#prisma.raidTier.deleteMany({
      where: { pct, level: { gt: 0 } },
    })
    return this.#prisma.raidTier.findUniqueOrThrow({
      where: { pct_level: { pct, level: 0 } },
      include: { reward: true },
    })
  }

  findRaid(teamId: string, weekKey: string): Promise<TeamRaidWithBoss | null> {
    return this.#prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey } },
      include: { boss: true },
    })
  }

  upsertRaid(data: {
    teamId: string
    weekKey: string
    bossId: string
    maxHp: number
    memberCountAtStart: number
    level: number
  }): Promise<TeamRaidWithBoss> {
    return this.#prisma.teamRaid.upsert({
      where: { teamId_weekKey: { teamId: data.teamId, weekKey: data.weekKey } },
      create: { ...data, hp: data.maxHp },
      // Ne jamais écraser un raid existant : `update: {}` rend l'appel idempotent.
      update: {},
      include: { boss: true },
    })
  }

  async listContributions(raidId: string): Promise<RaidContributionRow[]> {
    const rows = await this.#prisma.raidAttack.groupBy({
      by: ['userId'],
      where: { raidId },
      _sum: { damage: true },
      _count: { _all: true },
      orderBy: { _sum: { damage: 'desc' } },
    })
    return rows.map((r) => ({
      userId: r.userId,
      damage: r._sum.damage ?? 0,
      attacks: r._count._all,
    }))
  }

  countUserAttacksSince(
    raidId: string,
    userId: string,
    since: Date,
  ): Promise<number> {
    return this.#prisma.raidAttack.count({
      where: { raidId, userId, createdAt: { gte: since } },
    })
  }

  async countAttacksByUsersSince(
    raidId: string,
    userIds: string[],
    since: Date,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) {
      return new Map()
    }
    const rows = await this.#prisma.raidAttack.groupBy({
      by: ['userId'],
      where: { raidId, userId: { in: userIds }, createdAt: { gte: since } },
      _count: { _all: true },
    })
    return new Map(rows.map((r) => [r.userId, r._count._all]))
  }

  listRaidsForTeams(
    teamIds: string[],
    weekKey: string,
  ): Promise<TeamRaidWithBoss[]> {
    if (teamIds.length === 0) {
      return Promise.resolve([])
    }
    return this.#prisma.teamRaid.findMany({
      where: { teamId: { in: teamIds }, weekKey },
      include: { boss: true },
    })
  }

  listPastRaids(
    teamId: string,
    weekKey: string,
    limit: number,
  ): Promise<TeamRaidWithBoss[]> {
    return this.#prisma.teamRaid.findMany({
      // `lt` et pas `not` : la clé de semaine est une date ISO (AAAA-MM-JJ
      // du lundi), donc l'ordre lexicographique EST l'ordre chronologique.
      // Un raid d'une semaine future n'existe pas, mais s'il en apparaissait
      // un (horloge décalée, seed), il n'a rien à faire dans un historique.
      where: { teamId, weekKey: { lt: weekKey } },
      include: { boss: true },
      orderBy: { weekKey: 'desc' },
      take: limit,
    })
  }

  countKills(teamId: string): Promise<number> {
    return this.#prisma.teamRaid.count({
      where: { teamId, killedAt: { not: null } },
    })
  }

  /**
   * Dernier raid STRICTEMENT antérieur à `weekKey`, quelle que soit son
   * ancienneté — c'est la référence de `nextRaidLevel`. Même remarque que
   * `listPastRaids` : la clé de semaine est une date ISO, donc l'ordre
   * lexicographique EST l'ordre chronologique.
   */
  findLastRaidBefore(
    teamId: string,
    weekKey: string,
  ): Promise<TeamRaid | null> {
    return this.#prisma.teamRaid.findFirst({
      where: { teamId, weekKey: { lt: weekKey } },
      orderBy: { weekKey: 'desc' },
    })
  }
}
