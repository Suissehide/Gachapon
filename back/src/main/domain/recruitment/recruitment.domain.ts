import Boom from '@hapi/boom'

import type { JoinRequestStatus } from '../../../generated/client'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IRecruitmentDomain,
  MyJoinRequestView,
  TeamJoinRequestView,
} from '../../types/domain/recruitment/recruitment.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import type {
  IJoinRequestRepository,
  JoinRequestWithTeam,
} from '../../types/infra/orm/repositories/join-request.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
import { MAX_TEAMS_PER_USER } from '../team/team.domain'
import { hueFromName } from '../team-progression/team-progression-rules'
import {
  countActivePending,
  isJoinRequestExpired,
  JOIN_REQUEST_TTL_MS,
  MAX_PENDING_JOIN_REQUESTS,
  reapplyBlockedUntil,
} from './recruitment-rules'

export class RecruitmentDomain implements IRecruitmentDomain {
  readonly #joinRequestRepo: IJoinRequestRepository
  readonly #teamRepo: TeamRepository
  readonly #memberRepo: TeamMemberRepository
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #achievementsDomain: AchievementsDomainInterface

  constructor({
    joinRequestRepository,
    teamRepository,
    teamMemberRepository,
    postgresOrm,
    configService,
    achievementsDomain,
  }: IocContainer) {
    this.#joinRequestRepo = joinRequestRepository
    this.#teamRepo = teamRepository
    this.#memberRepo = teamMemberRepository
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
  }

  async apply(teamId: string, userId: string): Promise<MyJoinRequestView> {
    const now = new Date()

    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const alreadyMember = await this.#memberRepo.findByTeamAndUser(
      teamId,
      userId,
    )
    if (alreadyMember) {
      throw Boom.conflict('Already a member of this team')
    }

    const mine = await this.#joinRequestRepo.listByUser(userId)
    await this.#sweepExpired(mine, now)

    const existing = mine.find((req) => req.teamId === teamId) ?? null
    if (
      existing &&
      existing.status === 'PENDING' &&
      !isJoinRequestExpired(existing, now)
    ) {
      throw Boom.conflict('Join request already pending for this team')
    }

    const blockedUntil = reapplyBlockedUntil(existing)
    if (blockedUntil && blockedUntil > now) {
      throw Boom.conflict(
        `Candidature refusée récemment ; réessaie après le ${blockedUntil.toISOString()}`,
      )
    }

    const teamSummary = {
      id: team.id,
      name: team.name,
      slug: team.slug,
      hue: team.hue,
    }

    // Le plafond de 5 est un INVARIANT SUR L'ENSEMBLE des candidatures du
    // joueur, pas sur cette seule équipe : hors transaction, deux `apply()`
    // concurrents vers deux équipes différentes liraient tous deux un
    // compteur à 4 et passeraient tous deux, dépassant le plafond. Sous
    // Serializable, la lecture du compteur et l'écriture qui la contredit
    // ne peuvent pas toutes les deux survivre — la seconde transaction
    // échoue en P2034, `retryOnSerialization` la rejoue et elle relit alors
    // le compteur à jour. Même motif que `DuelDomain#propose`.
    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const freshMine = await this.#joinRequestRepo.listByUserInTx(
            tx,
            userId,
          )
          if (countActivePending(freshMine, now) >= MAX_PENDING_JOIN_REQUESTS) {
            throw Boom.conflict(
              `Maximum ${MAX_PENDING_JOIN_REQUESTS} candidatures en attente`,
            )
          }

          const created = await this.#joinRequestRepo.upsertPendingInTx(tx, {
            teamId,
            userId,
            expiresAt: new Date(now.getTime() + JOIN_REQUEST_TTL_MS),
          })

          return this.#toView(
            { ...created, team: teamSummary },
            'PENDING',
            null,
          )
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  async cancel(teamId: string, userId: string): Promise<void> {
    const existing = await this.#joinRequestRepo.findByTeamAndUser(
      teamId,
      userId,
    )
    if (!existing || existing.status !== 'PENDING') {
      throw Boom.notFound('No pending join request for this team')
    }
    await this.#joinRequestRepo.setStatus(existing.id, 'CANCELLED')
  }

  /**
   * Fait entrer le candidat. Les deux blocages possibles sont volontairement
   * asymétriques : le candidat qui a atteint ses 3 équipes est bloqué
   * DÉFINITIVEMENT tant qu'il n'en quitte pas une, donc la demande est
   * expirée pour épargner au chef de retomber dessus à chaque passage sur
   * sa file ; l'équipe pleine, elle, PEUT se libérer demain, donc la
   * demande reste en attente.
   */
  async accept(
    requestId: string,
    actorId: string,
  ): Promise<{ teamId: string; userId: string; teamName: string }> {
    const now = new Date()
    const req = await this.#joinRequestRepo.findById(requestId)
    if (!req) {
      throw Boom.notFound('Join request not found')
    }
    if (req.status !== 'PENDING' || isJoinRequestExpired(req, now)) {
      throw Boom.conflict('Join request already processed')
    }

    await this.#assertCanDecide(req.teamId, actorId)

    const teamCount = await this.#teamRepo.countByUserId(req.userId)
    if (teamCount >= MAX_TEAMS_PER_USER) {
      await this.#joinRequestRepo.setStatus(req.id, 'EXPIRED')
      throw Boom.forbidden(
        `@${req.user.username} a atteint sa limite de ${MAX_TEAMS_PER_USER} équipes`,
      )
    }

    const [memberCount, config] = await Promise.all([
      this.#memberRepo.countByTeam(req.teamId),
      this.#configService.getMany('team.maxMembers'),
    ])
    if (memberCount >= config['team.maxMembers']) {
      throw Boom.forbidden(
        `Cette équipe est complète (${config['team.maxMembers']} membres)`,
      )
    }

    await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      // La garde `status: 'PENDING'` du `updateMany` fait le départage
      // quand deux officiers cliquent en même temps : le perdant touche
      // zéro ligne.
      const updated = await this.#joinRequestRepo.decideIfPending(
        tx,
        req.id,
        'ACCEPTED',
        actorId,
        now,
      )
      if (updated === 0) {
        throw Boom.conflict('Join request already processed')
      }
      await tx.teamMember.create({
        data: { teamId: req.teamId, userId: req.userId, role: 'MEMBER' },
      })
      // Même succès que par invitation (`team.domain.ts:393`) : sans ça la
      // quête « rejoindre une équipe » ne se valide jamais par candidature.
      await this.#achievementsDomain.track(tx, req.userId, {
        kind: 'TEAM_JOINED',
      })
    })

    return { teamId: req.teamId, userId: req.userId, teamName: req.team.name }
  }

  async decline(
    requestId: string,
    actorId: string,
  ): Promise<{ teamId: string; userId: string; teamName: string }> {
    const now = new Date()
    const req = await this.#joinRequestRepo.findById(requestId)
    if (!req) {
      throw Boom.notFound('Join request not found')
    }
    if (req.status !== 'PENDING' || isJoinRequestExpired(req, now)) {
      throw Boom.conflict('Join request already processed')
    }
    await this.#assertCanDecide(req.teamId, actorId)

    await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const updated = await this.#joinRequestRepo.decideIfPending(
        tx,
        req.id,
        'DECLINED',
        actorId,
        now,
      )
      if (updated === 0) {
        throw Boom.conflict('Join request already processed')
      }
    })

    return { teamId: req.teamId, userId: req.userId, teamName: req.team.name }
  }

  /**
   * Le joueur est entré par une AUTRE porte (invitation) pendant que sa
   * candidature dormait : elle n'a plus d'objet. Sans cet appel, le chef voit
   * dans sa file la demande de quelqu'un qui est déjà membre.
   */
  async closeForMember(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await tx.joinRequest.updateMany({
      where: { teamId, userId, status: 'PENDING' },
      data: { status: 'ACCEPTED', decidedAt: new Date() },
    })
  }

  /**
   * Trois durées de vie, aucune colonne « lu » en base :
   * - `PENDING` tant que la demande vit ;
   * - `DECLINED` tant que le cooldown court — la ligne de `/team` sert à
   *   expliquer pourquoi une recandidature est refusée, donc elle disparaît
   *   exactement quand le verrou tombe ;
   * - `ACCEPTED` pendant 7 jours, le temps que la cloche annonce la bonne
   *   nouvelle ; le front la chasse d'un clic côté navigateur.
   */
  async listMine(userId: string): Promise<MyJoinRequestView[]> {
    const now = new Date()
    const all = await this.#joinRequestRepo.listByUser(userId)
    await this.#sweepExpired(all, now)

    return all.flatMap((req) => {
      if (req.status === 'PENDING' && !isJoinRequestExpired(req, now)) {
        return [this.#toView(req, 'PENDING', null)]
      }
      if (
        req.status === 'ACCEPTED' &&
        req.decidedAt &&
        req.decidedAt.getTime() > now.getTime() - JOIN_REQUEST_TTL_MS
      ) {
        return [this.#toView(req, 'ACCEPTED', null)]
      }
      const reapplyAt = reapplyBlockedUntil(req)
      if (reapplyAt && reapplyAt > now) {
        return [this.#toView(req, 'DECLINED', reapplyAt)]
      }
      return []
    })
  }

  /**
   * Même règle que `inviteMember` (`team.domain.ts:253`) : OWNER ou ADMIN.
   * Revérifiée à CHAQUE action, jamais seulement à l'affichage — la cloche
   * peut rester ouverte longtemps après une rétrogradation.
   */
  async #assertCanDecide(teamId: string, actorId: string): Promise<void> {
    const actor = await this.#memberRepo.findByTeamAndUser(teamId, actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Only ADMIN or OWNER can handle join requests')
    }
  }

  async listForTeam(
    teamId: string,
    actorId: string,
  ): Promise<TeamJoinRequestView[]> {
    await this.#assertCanDecide(teamId, actorId)
    const now = new Date()
    const pending = await this.#joinRequestRepo.listPendingByTeam(teamId)
    await this.#sweepExpired(pending, now)
    return pending
      .filter((req) => req.status === 'PENDING')
      .map((req) => ({
        id: req.id,
        createdAt: req.createdAt,
        candidate: req.user,
      }))
  }

  #toView(
    req: JoinRequestWithTeam,
    status: 'PENDING' | 'DECLINED' | 'ACCEPTED',
    reapplyAt: Date | null,
  ): MyJoinRequestView {
    return {
      id: req.id,
      teamId: req.teamId,
      teamName: req.team.name,
      teamSlug: req.team.slug,
      hue: req.team.hue ?? hueFromName(req.team.name),
      status,
      createdAt: req.createdAt,
      expiresAt: req.expiresAt,
      reapplyAt,
      decidedAt: req.decidedAt,
    }
  }

  /**
   * Expiration paresseuse, comme les invitations (`team.domain.ts:345`) :
   * la lecture fait foi, l'écriture rattrape. Muter les objets déjà chargés
   * évite un second aller-retour pour recalculer la liste.
   */
  async #sweepExpired(
    reqs: { id: string; status: JoinRequestStatus; expiresAt: Date }[],
    now: Date,
  ): Promise<void> {
    const stale = reqs.filter((req) => isJoinRequestExpired(req, now))
    if (stale.length === 0) {
      return
    }
    await this.#joinRequestRepo.markExpired(stale.map((req) => req.id))
    for (const req of stale) {
      req.status = 'EXPIRED'
    }
  }
}
