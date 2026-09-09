import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type {
  DuelView,
  IDuelDomain,
  WagersView,
} from '../../types/domain/wagers/wagers.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  DuelWithParties,
  IWagerRepository,
} from '../../types/infra/orm/repositories/wager.repository.interface'
import type { TeamWithMembers } from '../../types/domain/team/team.types'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type {
  DuelProposedEvent,
  DuelUpdateEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'

const HOUR_MS = 60 * 60 * 1000

// Nombre de duels réglés récents renvoyés par la lecture d'équipe — le
// règlement n'existe pas encore à cette tâche, mais la vue l'anticipe.
const RECENT_SETTLED_DUELS = 20

export class DuelDomain implements IDuelDomain {
  readonly #configService: ConfigServiceInterface
  readonly #teamRepository: TeamRepository
  readonly #teamMemberRepository: TeamMemberRepository
  readonly #wagerRepository: IWagerRepository
  readonly #postgresOrm: PostgresOrm
  readonly #wsManager: WsManager

  constructor({
    configService,
    teamRepository,
    teamMemberRepository,
    wagerRepository,
    postgresOrm,
    wsManager,
  }: IocContainer) {
    this.#configService = configService
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#wagerRepository = wagerRepository
    this.#postgresOrm = postgresOrm
    this.#wsManager = wsManager
  }

  /**
   * Propose un duel. La vérification d'appartenance à l'équipe se fait
   * avant tout autre accès — un non-membre ne doit jamais créer de ligne
   * ni déclencher de notification.
   */
  async propose(
    teamId: string,
    challengerId: string,
    opponentId: string,
    // `now` figure dans la signature de l'interface pour symétrie avec
    // accept/listForTeam, mais createDuel s'appuie sur l'horodatage
    // Prisma par défaut — rien à en faire ici.
    _now: Date = new Date(),
  ): Promise<DuelView> {
    const team = await this.#requireMembership(teamId, challengerId)

    if (opponentId === challengerId) {
      throw Boom.badRequest('Tu ne peux pas te défier toi-même')
    }
    const opponentMember = team.members.find((m) => m.userId === opponentId)
    if (!opponentMember) {
      throw Boom.badRequest("Cet adversaire ne fait pas partie de l'équipe")
    }

    const [challengerOpen, opponentOpen] = await Promise.all([
      this.#wagerRepository.findOpenDuelForUser(challengerId),
      this.#wagerRepository.findOpenDuelForUser(opponentId),
    ])
    if (challengerOpen) {
      throw Boom.conflict('Tu as déjà un duel en cours')
    }
    if (opponentOpen) {
      const opponentName = opponentMember.user?.username ?? 'Ce joueur'
      throw Boom.conflict(`${opponentName} a déjà un duel en cours`)
    }

    const cfg = await this.#configService.getMany('duel.pullCount')
    const duel = await this.#wagerRepository.createDuel({
      teamId,
      challengerId,
      opponentId,
      pullCount: cfg['duel.pullCount'],
    })
    const full = await this.#wagerRepository.findDuelById(duel.id)
    if (!full) {
      throw Boom.badImplementation('Duel introuvable juste après sa création')
    }

    const challengerMember = team.members.find(
      (m) => m.userId === challengerId,
    )
    const event: DuelProposedEvent = {
      type: 'duel:proposed',
      teamId,
      duelId: duel.id,
      challenger: {
        id: challengerId,
        username: challengerMember?.user?.username ?? 'Un coéquipier',
      },
    }
    for (const member of team.members) {
      this.#wsManager.notify(member.userId, event)
    }

    return this.#toView(full, challengerId)
  }

  /**
   * Seul l'adversaire peut accepter, uniquement tant que le duel est
   * PENDING et dans le délai d'acceptation — au-delà, le duel est marché
   * EXPIRED plutôt que silencieusement refusé.
   */
  async accept(
    teamId: string,
    duelId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<DuelView> {
    const team = await this.#requireMembership(teamId, userId)
    const duel = await this.#getTeamDuel(teamId, duelId)

    if (duel.opponentId !== userId) {
      throw Boom.forbidden('Seul le joueur défié peut accepter ce duel')
    }
    if (duel.status !== 'PENDING') {
      throw Boom.conflict("Ce duel n'est plus en attente d'acceptation")
    }

    const cfg = await this.#configService.getMany(
      'duel.acceptHours',
      'duel.deadlineHours',
    )
    const acceptDeadline =
      duel.createdAt.getTime() + cfg['duel.acceptHours'] * HOUR_MS
    if (now.getTime() > acceptDeadline) {
      await this.#postgresOrm.prisma.duel.update({
        where: { id: duel.id },
        data: { status: 'EXPIRED' },
      })
      throw Boom.conflict("Le délai pour accepter ce duel est dépassé")
    }

    const deadlineAt = new Date(now.getTime() + cfg['duel.deadlineHours'] * HOUR_MS)
    await this.#postgresOrm.prisma.duel.update({
      where: { id: duel.id },
      data: { status: 'ACTIVE', acceptedAt: now, deadlineAt },
    })
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après acceptation')
    }

    const event: DuelUpdateEvent = {
      type: 'duel:update',
      teamId,
      duelId: duel.id,
      status: updated.status,
      challengerScore: updated.challengerScore / 2,
      opponentScore: updated.opponentScore / 2,
      challengerPulls: updated.challengerPulls,
      opponentPulls: updated.opponentPulls,
      pullCount: updated.pullCount,
    }
    for (const member of team.members) {
      this.#wsManager.notify(member.userId, event)
    }

    return this.#toView(updated, userId)
  }

  /** Seul l'adversaire peut refuser, uniquement tant que le duel est PENDING. */
  async decline(teamId: string, duelId: string, userId: string): Promise<DuelView> {
    await this.#requireMembership(teamId, userId)
    const duel = await this.#getTeamDuel(teamId, duelId)

    if (duel.opponentId !== userId) {
      throw Boom.forbidden('Seul le joueur défié peut refuser ce duel')
    }
    if (duel.status !== 'PENDING') {
      throw Boom.conflict("Ce duel n'est plus en attente d'acceptation")
    }

    await this.#postgresOrm.prisma.duel.update({
      where: { id: duel.id },
      data: { status: 'DECLINED' },
    })
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après refus')
    }
    return this.#toView(updated, userId)
  }

  /** Seul le défieur peut annuler, uniquement tant que le duel est PENDING. */
  async cancel(teamId: string, duelId: string, userId: string): Promise<DuelView> {
    await this.#requireMembership(teamId, userId)
    const duel = await this.#getTeamDuel(teamId, duelId)

    if (duel.challengerId !== userId) {
      throw Boom.forbidden('Seul le défieur peut annuler ce duel')
    }
    if (duel.status !== 'PENDING') {
      throw Boom.conflict("Ce duel n'est plus en attente d'acceptation")
    }

    await this.#postgresOrm.prisma.duel.update({
      where: { id: duel.id },
      data: { status: 'CANCELLED' },
    })
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après annulation')
    }
    return this.#toView(updated, userId)
  }

  /**
   * Expire d'abord les PENDING hors délai d'acceptation, puis renvoie la
   * vue. Le règlement des ACTIVE en retard (`listStaleForTeam`) arrive en
   * tâche 6 — ici un duel ACTIVE reste ACTIVE sans jamais se conclure.
   */
  async listForTeam(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<WagersView> {
    await this.#requireMembership(teamId, userId)

    const [duels, settledDuels, cfg] = await Promise.all([
      this.#wagerRepository.listTeamDuels(teamId),
      this.#wagerRepository.listRecentSettledDuels(
        teamId,
        RECENT_SETTLED_DUELS,
      ),
      this.#configService.getMany('duel.acceptHours'),
    ])

    const acceptDeadlineMs = cfg['duel.acceptHours'] * HOUR_MS
    const staleIds = duels
      .filter(
        (d) =>
          d.status === 'PENDING' &&
          now.getTime() - d.createdAt.getTime() > acceptDeadlineMs,
      )
      .map((d) => d.id)
    if (staleIds.length > 0) {
      await this.#postgresOrm.prisma.duel.updateMany({
        where: { id: { in: staleIds } },
        data: { status: 'EXPIRED' },
      })
      const staleSet = new Set(staleIds)
      for (const d of duels) {
        if (staleSet.has(d.id)) {
          d.status = 'EXPIRED'
        }
      }
    }

    return {
      duels: duels
        .filter((d) => d.status !== 'SETTLED')
        .map((d) => this.#toView(d, userId)),
      settledDuels: settledDuels.map((d) => this.#toView(d, userId)),
    }
  }

  async #requireMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamWithMembers> {
    const membership = await this.#teamMemberRepository.findByTeamAndUser(
      teamId,
      userId,
    )
    if (!membership) {
      throw Boom.forbidden('Tu ne fais pas partie de cette équipe')
    }
    const team = await this.#teamRepository.findById(teamId)
    if (!team) {
      throw Boom.notFound('Équipe introuvable')
    }
    return team
  }

  async #getTeamDuel(teamId: string, duelId: string): Promise<DuelWithParties> {
    const duel = await this.#wagerRepository.findDuelById(duelId)
    if (!duel || duel.teamId !== teamId) {
      throw Boom.notFound('Duel introuvable')
    }
    return duel
  }

  #toView(duel: DuelWithParties, userId: string): DuelView {
    const myRole =
      duel.challengerId === userId
        ? 'CHALLENGER'
        : duel.opponentId === userId
          ? 'OPPONENT'
          : 'SPECTATOR'
    return {
      id: duel.id,
      status: duel.status,
      challenger: {
        id: duel.challenger.id,
        username: duel.challenger.username,
        avatar: duel.challenger.avatar,
      },
      opponent: {
        id: duel.opponent.id,
        username: duel.opponent.username,
        avatar: duel.opponent.avatar,
      },
      pullCount: duel.pullCount,
      challengerPulls: duel.challengerPulls,
      opponentPulls: duel.opponentPulls,
      challengerScore: duel.challengerScore / 2,
      opponentScore: duel.opponentScore / 2,
      createdAt: duel.createdAt.toISOString(),
      acceptedAt: duel.acceptedAt ? duel.acceptedAt.toISOString() : null,
      deadlineAt: duel.deadlineAt ? duel.deadlineAt.toISOString() : null,
      settledAt: duel.settledAt ? duel.settledAt.toISOString() : null,
      winnerId: duel.winnerId,
      myRole,
    }
  }
}
