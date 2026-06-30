import { computeFinalStats } from '../combat/combat-stats.domain'
import type { IocContainer } from '../../types/application/ioc'
import type {
  CollectorEntry,
  CombatEntry,
  ILeaderboardDomain,
  LeaderboardResponse,
  TeamEntry,
} from '../../types/domain/leaderboard/leaderboard.domain.interface'
import { LEADERBOARD_TOP_N } from '../../types/domain/leaderboard/leaderboard.domain.interface'
import type {
  CollectorRankingRowWithLevel,
  TeamForRanking,
  ILeaderboardRepository,
} from '../../types/infra/orm/repositories/leaderboard.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { EquipmentBonuses } from '../combat/combat-stats.domain'

export class LeaderboardDomain implements ILeaderboardDomain {
  readonly #leaderboardRepository: ILeaderboardRepository
  readonly #userRepository: UserRepositoryInterface

  constructor({ leaderboardRepository, userRepository }: IocContainer) {
    this.#leaderboardRepository = leaderboardRepository
    this.#userRepository = userRepository
  }

  async getCollectorsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<CollectorEntry>> {
    const { total, variantEligible } =
      await this.#leaderboardRepository.countActiveCards()
    const totalPossibleVariants =
      total - variantEligible + variantEligible * 3

    const topRows =
      await this.#leaderboardRepository.getCollectorRankingWithLevel(
        LEADERBOARD_TOP_N,
      )
    const topUserIds = topRows.map((r) => r.userId)

    const includesMe = topUserIds.includes(currentUserId)
    const userIdsToFetch = includesMe
      ? topUserIds
      : [...topUserIds, currentUserId]

    const users = await this.#userRepository.findManyByIds(userIdsToFetch)
    const userMap = new Map(users.map((u) => [u.id, u]))
    const pulls = await this.#leaderboardRepository.countPullsByUsers(
      userIdsToFetch,
    )
    const legendaries =
      await this.#leaderboardRepository.countLegendariesByUsers(userIdsToFetch)

    const toEntry = (
      row: CollectorRankingRowWithLevel,
      rank: number,
    ): CollectorEntry => {
      const u = userMap.get(row.userId)
      const distinctCards = Number(row.distinctCards)
      const totalVariants = Number(row.totalVariants)
      return {
        rank,
        user: {
          id: row.userId,
          username: u?.username ?? 'Unknown',
          level: row.level,
          avatar: u?.avatar ?? null,
        },
        cardPercentage:
          total > 0 ? Math.round((distinctCards / total) * 100) : 0,
        variantPercentage:
          totalPossibleVariants > 0
            ? Math.round((totalVariants / totalPossibleVariants) * 100)
            : 0,
        pulls: pulls.get(row.userId) ?? 0,
        legendaries: legendaries.get(row.userId) ?? 0,
      }
    }

    const entries = topRows.map((r, i) => toEntry(r, i + 1))

    let currentUserEntry: CollectorEntry | null = null
    if (!includesMe) {
      const myRow =
        await this.#leaderboardRepository.getCurrentUserCollectorRow(
          currentUserId,
        )
      if (myRow) {
        const ahead = await this.#leaderboardRepository.countCollectorsAhead(
          currentUserId,
          Number(myRow.distinctCards),
          Number(myRow.totalVariants),
        )
        currentUserEntry = toEntry(myRow, ahead + 1)
      }
    }

    return { entries, currentUserEntry }
  }

  async getTeamsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<TeamEntry>> {
    const teams = await this.#leaderboardRepository.getTeamsForRanking()
    if (teams.length === 0) { return { entries: [], currentUserEntry: null } }

    const { total, variantEligible } =
      await this.#leaderboardRepository.countActiveCards()
    const totalPossibleVariants =
      total - variantEligible + variantEligible * 3

    const allMemberIds = [...new Set(teams.flatMap((t) => t.memberIds))]
    const memberCards =
      await this.#leaderboardRepository.getUserCardsByUserIds(allMemberIds)
    const pullsByMember =
      await this.#leaderboardRepository.countPullsByUsers(allMemberIds)

    // Group member cards by userId for fast lookup.
    const cardsByUser = new Map<string, typeof memberCards>()
    for (const uc of memberCards) {
      const list = cardsByUser.get(uc.userId) ?? []
      list.push(uc)
      cardsByUser.set(uc.userId, list)
    }

    const scoreTeam = (team: TeamForRanking) => {
      // Collective unique cards: dedupe by cardId across all members.
      const distinctCardIds = new Set<string>()
      const distinctVariantKeys = new Set<string>()
      let pullsTotal = 0
      for (const userId of team.memberIds) {
        for (const uc of cardsByUser.get(userId) ?? []) {
          distinctCardIds.add(uc.cardId)
          distinctVariantKeys.add(`${uc.cardId}:${uc.variant}`)
        }
        pullsTotal += pullsByMember.get(userId) ?? 0
      }
      return {
        team,
        cardPercentage:
          total > 0
            ? Math.round((distinctCardIds.size / total) * 100)
            : 0,
        variantPercentage:
          totalPossibleVariants > 0
            ? Math.round(
                (distinctVariantKeys.size / totalPossibleVariants) * 100,
              )
            : 0,
        pullsTotal,
      }
    }

    const scored = teams.map(scoreTeam).sort((a, b) => {
      if (b.cardPercentage !== a.cardPercentage) {
        return b.cardPercentage - a.cardPercentage
      }
      if (b.variantPercentage !== a.variantPercentage) {
        return b.variantPercentage - a.variantPercentage
      }
      return b.pullsTotal - a.pullsTotal
    })

    const entries: TeamEntry[] = scored
      .slice(0, LEADERBOARD_TOP_N)
      .map((s, i) => ({
        rank: i + 1,
        team: {
          id: s.team.id,
          name: s.team.name,
          slug: s.team.slug,
          memberCount: s.team.memberCount,
        },
        cardPercentage: s.cardPercentage,
        variantPercentage: s.variantPercentage,
        pullsTotal: s.pullsTotal,
      }))

    let currentUserEntry: TeamEntry | null = null
    const myTeamId =
      await this.#leaderboardRepository.getTeamIdForUser(currentUserId)
    if (myTeamId && !entries.find((e) => e.team.id === myTeamId)) {
      const myIndex = scored.findIndex((s) => s.team.id === myTeamId)
      const myScored = myIndex >= 0 ? scored[myIndex] : undefined
      if (myIndex >= 0 && myScored) {
        currentUserEntry = {
          rank: myIndex + 1,
          team: {
            id: myScored.team.id,
            name: myScored.team.name,
            slug: myScored.team.slug,
            memberCount: myScored.team.memberCount,
          },
          cardPercentage: myScored.cardPercentage,
          variantPercentage: myScored.variantPercentage,
          pullsTotal: myScored.pullsTotal,
        }
      }
    }

    return { entries, currentUserEntry, currentUserTeamId: myTeamId }
  }

  async getCombatLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<CombatEntry>> {
    const [maxPalier, stagesOrdered, activeUserIds] = await Promise.all([
      this.#leaderboardRepository.countCampaignStages(),
      this.#leaderboardRepository.getAllCampaignStagesOrdered(),
      this.#leaderboardRepository.getActiveUserIds(),
    ])

    const candidateIds = activeUserIds.includes(currentUserId)
      ? activeUserIds
      : [...activeUserIds, currentUserId]

    if (candidateIds.length === 0) {
      return { entries: [], currentUserEntry: null }
    }

    const [progressMap, combatCardsMap, users] = await Promise.all([
      this.#leaderboardRepository.getCampaignProgressByUsers(candidateIds),
      this.#leaderboardRepository.getCombatTeamCardsByUsers(candidateIds),
      this.#userRepository.findManyByIds(candidateIds),
    ])
    const userMap = new Map(users.map((u) => [u.id, u]))

    const scored = candidateIds.map((userId) => {
      const palier = this.#leaderboardRepository.computePalierForProgress(
        progressMap.get(userId) ?? null,
        stagesOrdered,
      )
      const cards = combatCardsMap.get(userId) ?? []
      const combatPower = cards.reduce((sum, c) => {
        const stats = computeFinalStats({
          baseHp: c.card.baseHp,
          baseAtk: c.card.baseAtk,
          baseDef: c.card.baseDef,
          baseSpd: c.card.baseSpd,
          level: c.level,
          palier: c.palier,
          variant: c.variant,
          equipment: c.equipmentBonuses as EquipmentBonuses[],
        })
        return sum + stats.hp + stats.atk + stats.def + stats.spd
      }, 0)
      return { userId, palier, combatPower }
    })

    scored.sort((a, b) => {
      if (b.palier !== a.palier) { return b.palier - a.palier }
      return b.combatPower - a.combatPower
    })

    const toEntry = (
      s: { userId: string; palier: number; combatPower: number },
      rank: number,
    ): CombatEntry => {
      const u = userMap.get(s.userId)
      return {
        rank,
        user: {
          id: s.userId,
          username: u?.username ?? 'Unknown',
          level: u?.level ?? 1,
          avatar: u?.avatar ?? null,
        },
        palier: s.palier,
        maxPalier,
        combatPower: Math.round(s.combatPower),
      }
    }

    const entries = scored
      .slice(0, LEADERBOARD_TOP_N)
      .map((s, i) => toEntry(s, i + 1))

    let currentUserEntry: CombatEntry | null = null
    if (!entries.find((e) => e.user.id === currentUserId)) {
      const myIndex = scored.findIndex((s) => s.userId === currentUserId)
      const myScored = myIndex >= 0 ? scored[myIndex] : undefined
      if (myScored) { currentUserEntry = toEntry(myScored, myIndex + 1) }
    }

    return { entries, currentUserEntry }
  }
}
