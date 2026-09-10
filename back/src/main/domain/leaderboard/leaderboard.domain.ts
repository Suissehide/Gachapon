import type { IocContainer } from '../../types/application/ioc'
import type {
  CollectorEntry,
  CombatEntry,
  ILeaderboardDomain,
  LeaderboardResponse,
  TeamEntry,
} from '../../types/domain/leaderboard/leaderboard.domain.interface'
import { LEADERBOARD_TOP_N } from '../../types/domain/leaderboard/leaderboard.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  CollectorRankingRowWithLevel,
  ILeaderboardRepository,
  TeamForRanking,
} from '../../types/infra/orm/repositories/leaderboard.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { EquipmentBonuses } from '../combat/combat-stats.domain'
import { computeFinalStats } from '../combat/combat-stats.domain'
import {
  computeSetBonuses,
  SET_BONUS_CONFIG_KEYS,
  setBonusesFromConfig,
} from '../equipment/set-bonuses'

/** Une seule clé, partagée par la page Classement et par le rang de la fiche. */
const TEAM_RANKING_CACHE_KEY = 'leaderboard:teams:ranking'
/** Assez court pour qu'un joueur ne voie jamais un rang qu'il sente figé. */
const TEAM_RANKING_TTL_SECONDS = 60

/** Une équipe notée, réduite à ce que les deux vues affichent. */
type RankedTeam = Omit<TeamEntry, 'rank'>

export class LeaderboardDomain implements ILeaderboardDomain {
  readonly #leaderboardRepository: ILeaderboardRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #configService: ConfigServiceInterface
  readonly #redis: RedisClientInterface

  constructor({
    leaderboardRepository,
    userRepository,
    configService,
    redisClient,
  }: IocContainer) {
    this.#leaderboardRepository = leaderboardRepository
    this.#userRepository = userRepository
    this.#configService = configService
    this.#redis = redisClient
  }

  async getCollectorsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<CollectorEntry>> {
    const { total, variantEligible } =
      await this.#leaderboardRepository.countActiveCards()
    const totalPossibleVariants = total - variantEligible + variantEligible * 3

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
    const pulls =
      await this.#leaderboardRepository.countPullsByUsers(userIdsToFetch)
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

  /**
   * Le classement d'équipes, trié, MÉMORISÉ. Une passe de calcul par minute
   * pour tout le monde, au lieu d'une par chargement de page.
   *
   * Le calcul complet est lourd et ne se scope pas : il matérialise en
   * mémoire les cartes possédées de TOUS les membres de TOUTES les équipes,
   * plus l'historique de tirages, et il faut tout cela même pour ne rendre
   * qu'UN rang. Or la fiche d'équipe est devenue la page d'atterrissage de
   * la section, rechargée au montage et au retour de focus, jusqu'à trois
   * équipes par joueur. Un rang vieux d'une minute est imperceptible ; le
   * calcul, lui, ne l'est pas.
   *
   * Un seul mémo pour les DEUX appelants (la page Classement et le rang de
   * la fiche) : deux caches, c'est deux échelles qui divergent.
   */
  async #rankedTeams(refresh = false): Promise<RankedTeam[]> {
    if (!refresh) {
      const cached = await this.#redis.get(TEAM_RANKING_CACHE_KEY)
      if (cached !== null) {
        return JSON.parse(cached) as RankedTeam[]
      }
    }
    const scored = await this.#scoreTeams()
    await this.#redis.set(
      TEAM_RANKING_CACHE_KEY,
      JSON.stringify(scored),
      TEAM_RANKING_TTL_SECONDS,
    )
    return scored
  }

  /**
   * Le classement d'équipes, trié, SANS troncature ni mise en forme.
   * Extrait de `getTeamsLeaderboard` pour que `getTeamRank` (le rang global
   * affiché sur la fiche d'équipe) lise exactement le même barème : deux
   * classements d'équipes divergeraient au premier ajustement.
   *
   * Ne renvoie de chaque équipe que ce que les deux vues consomment — pas
   * `memberIds`, qui ne sert qu'au calcul et qui gonflerait le mémo autant
   * qu'il y a de joueurs.
   */
  async #scoreTeams(): Promise<RankedTeam[]> {
    const teams = await this.#leaderboardRepository.getTeamsForRanking()
    if (teams.length === 0) {
      return []
    }

    const { total, variantEligible } =
      await this.#leaderboardRepository.countActiveCards()
    const totalPossibleVariants = total - variantEligible + variantEligible * 3

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
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          memberCount: team.memberCount,
        },
        cardPercentage:
          total > 0 ? Math.round((distinctCardIds.size / total) * 100) : 0,
        variantPercentage:
          totalPossibleVariants > 0
            ? Math.round(
                (distinctVariantKeys.size / totalPossibleVariants) * 100,
              )
            : 0,
        pullsTotal,
      }
    }

    return teams.map(scoreTeam).sort((a, b) => {
      if (b.cardPercentage !== a.cardPercentage) {
        return b.cardPercentage - a.cardPercentage
      }
      if (b.variantPercentage !== a.variantPercentage) {
        return b.variantPercentage - a.variantPercentage
      }
      return b.pullsTotal - a.pullsTotal
    })
  }

  /**
   * Rang global d'une équipe dans le classement d'équipes — le MÊME que
   * celui de la page Classement, complétion de collection comprise.
   * `null` quand l'équipe n'y figure pas (elle vient d'être supprimée).
   */
  async getTeamRank(teamId: string): Promise<number | null> {
    const ranked = await this.#rankedTeams()
    const index = ranked.findIndex((s) => s.team.id === teamId)
    if (index >= 0) {
      return index + 1
    }
    // Absente du mémo : l'équipe a été créée depuis qu'il a été calculé. Un
    // recalcul tranche, et il ne peut pas s'emballer — il rafraîchit le
    // mémo, et cette route n'est atteinte qu'après un contrôle
    // d'appartenance, donc sur une équipe qui existe.
    const fresh = await this.#rankedTeams(true)
    const freshIndex = fresh.findIndex((s) => s.team.id === teamId)
    return freshIndex >= 0 ? freshIndex + 1 : null
  }

  async getTeamsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<TeamEntry>> {
    const myTeamId =
      await this.#leaderboardRepository.getTeamIdForUser(currentUserId)
    const scored = await this.#rankedTeams()
    if (scored.length === 0) {
      return {
        entries: [],
        currentUserEntry: null,
        currentUserTeamId: myTeamId,
      }
    }

    const entries: TeamEntry[] = scored
      .slice(0, LEADERBOARD_TOP_N)
      .map((s, i) => ({ rank: i + 1, ...s }))

    let currentUserEntry: TeamEntry | null = null
    if (myTeamId && !entries.find((e) => e.team.id === myTeamId)) {
      const myIndex = scored.findIndex((s) => s.team.id === myTeamId)
      const myScored = myIndex >= 0 ? scored[myIndex] : undefined
      if (myIndex >= 0 && myScored) {
        currentUserEntry = { rank: myIndex + 1, ...myScored }
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

    const [progressMap, combatCardsMap, users, baseStatsCfg] =
      await Promise.all([
        this.#leaderboardRepository.getCampaignProgressByUsers(candidateIds),
        this.#leaderboardRepository.getCombatTeamCardsByUsers(candidateIds),
        this.#userRepository.findManyByIds(candidateIds),
        this.#configService.getMany(
          'combat.baseCritRate',
          'combat.baseCritDmg',
          'combat.baseArmorPen',
          'combat.baseLifesteal',
          ...SET_BONUS_CONFIG_KEYS,
        ),
      ])
    const userMap = new Map(users.map((u) => [u.id, u]))
    // combatPower ne dépend que de hp/atk/def/spd ; les stats de stuff sont
    // requises par computeFinalStats mais sans effet ici (câblage : tâche 6).
    const baseStats = {
      critRate: baseStatsCfg['combat.baseCritRate'],
      critDmg: baseStatsCfg['combat.baseCritDmg'],
      armorPen: baseStatsCfg['combat.baseArmorPen'],
      lifesteal: baseStatsCfg['combat.baseLifesteal'],
    }
    // Bonus de set — une seule reconstruction pour tout le calcul de classement.
    const setDefs = setBonusesFromConfig(baseStatsCfg)

    const scored = candidateIds.map((userId) => {
      const palier = this.#leaderboardRepository.computePalierForProgress(
        progressMap.get(userId) ?? null,
        stagesOrdered,
      )
      const cards = combatCardsMap.get(userId) ?? []
      const combatPower = cards.reduce((sum, c) => {
        // Bonus de set — comptés sur les pièces portées par CETTE carte.
        const setBonus = computeSetBonuses(c.setKeys, setDefs)
        const stats = computeFinalStats({
          baseHp: c.card.baseHp,
          baseAtk: c.card.baseAtk,
          baseDef: c.card.baseDef,
          baseSpd: c.card.baseSpd,
          level: c.level,
          palier: c.palier,
          variant: c.variant,
          baseStats,
          equipment: [...(c.equipmentBonuses as EquipmentBonuses[]), setBonus],
        })
        return sum + stats.hp + stats.atk + stats.def + stats.spd
      }, 0)
      return { userId, palier, combatPower }
    })

    scored.sort((a, b) => {
      if (b.palier !== a.palier) {
        return b.palier - a.palier
      }
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
      if (myScored) {
        currentUserEntry = toEntry(myScored, myIndex + 1)
      }
    }

    return { entries, currentUserEntry }
  }
}
