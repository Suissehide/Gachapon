import Boom from '@hapi/boom'

import type { JoinRequestStatus } from '../../../generated/client'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IRecruitmentDomain,
  MyJoinRequestView,
} from '../../types/domain/recruitment/recruitment.domain.interface'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type {
  IJoinRequestRepository,
  JoinRequestWithTeam,
} from '../../types/infra/orm/repositories/join-request.repository.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
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

  constructor({
    joinRequestRepository,
    teamRepository,
    teamMemberRepository,
    postgresOrm,
  }: IocContainer) {
    this.#joinRequestRepo = joinRequestRepository
    this.#teamRepo = teamRepository
    this.#memberRepo = teamMemberRepository
    this.#postgresOrm = postgresOrm
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
