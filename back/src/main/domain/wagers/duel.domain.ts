import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type {
  DuelView,
  IDuelDomain,
  WagersView,
} from '../../types/domain/wagers/wagers.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { IUserCardRepository } from '../../types/infra/orm/repositories/user-card.repository.interface'
import type {
  DuelWithParties,
  IWagerRepository,
  PullWithRarity,
} from '../../types/infra/orm/repositories/wager.repository.interface'
import type { TeamWithMembers } from '../../types/domain/team/team.types'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { IScoringConfigRepository } from '../../types/infra/orm/repositories/scoring-config.repository.interface'
import type { Logger } from '../../types/utils/logger'
import type {
  DuelProposedEvent,
  DuelSettledEvent,
  DuelUpdateEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'
import { retryOnSerialization } from '../shared/retry-serialization'
import { duelScoreHalfPoints, duelVerdict } from './wager-rules'

const HOUR_MS = 60 * 60 * 1000

// Nombre de duels réglés récents renvoyés par la lecture d'équipe.
const RECENT_SETTLED_DUELS = 20

type SettleOutcome = {
  teamId: string
  challengerId: string
  opponentId: string
  winnerId: string | null
  transferredCount: number
} | null

export class DuelDomain implements IDuelDomain {
  readonly #configService: ConfigServiceInterface
  readonly #teamRepository: TeamRepository
  readonly #teamMemberRepository: TeamMemberRepository
  readonly #wagerRepository: IWagerRepository
  readonly #userCardRepository: IUserCardRepository
  readonly #scoringConfigRepository: IScoringConfigRepository
  readonly #postgresOrm: PostgresOrm
  readonly #wsManager: WsManager
  readonly #logger: Logger

  constructor({
    configService,
    teamRepository,
    teamMemberRepository,
    wagerRepository,
    userCardRepository,
    scoringConfigRepository,
    postgresOrm,
    wsManager,
    logger,
  }: IocContainer) {
    this.#configService = configService
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#wagerRepository = wagerRepository
    this.#userCardRepository = userCardRepository
    this.#scoringConfigRepository = scoringConfigRepository
    this.#postgresOrm = postgresOrm
    this.#wsManager = wsManager
    this.#logger = logger
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
   * Expire d'abord les PENDING hors délai d'acceptation, règle ensuite les
   * ACTIVE dont l'échéance est passée (second déclencheur du règlement,
   * avec le tirage — sans lui un duel où les deux joueurs ont cessé de
   * tirer resterait ACTIVE indéfiniment), puis renvoie la vue.
   */
  async listForTeam(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<WagersView> {
    await this.#requireMembership(teamId, userId)

    // Chaque règlement est isolé dans son propre try/catch : contrairement
    // au déclencheur au tirage, cette lecture ne doit pas échouer pour
    // toute l'équipe si un seul duel stale échoue à se régler (P2034 qui
    // survit à tous les retries, par exemple) — même intention que le hook
    // `POST /pulls` (`void ... .catch(...)`), appliquée ici à une boucle
    // plutôt qu'à un fire-and-forget.
    const stale = await this.#wagerRepository.listStaleForTeam(teamId, now)
    for (const duelId of stale.duelIds) {
      try {
        await this.#settle(duelId, now)
      } catch (err) {
        this.#logger.error(
          `Règlement du duel stale ${duelId} échoué (equipe ${teamId}) : ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

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

  /**
   * Déclenché après chaque tirage : règle tous les duels ACTIVE où le
   * joueur est partie. Aucun état de progression n'est stocké — chaque
   * appel relit les tirages depuis GachaPull et recalcule tout, ce qui
   * rend l'opération idempotente et sûre à rejouer.
   */
  async settleForUser(userId: string, now: Date = new Date()): Promise<void> {
    const activeDuels = await this.#wagerRepository.listActiveDuelsForUser(
      userId,
    )
    for (const duel of activeDuels) {
      await this.#settle(duel.id, now)
    }
  }

  /**
   * Règle un duel. La config et le ScoringConfig sont lus AVANT la
   * transaction (pas d'I/O async supplémentaire une fois le tx Serializable
   * ouvert). La toute première lecture DANS le tx est le statut du duel :
   * s'il n'est plus ACTIVE, on sort sans rien faire — c'est ce qui rend un
   * double déclenchement (tirage + lecture d'équipe, ou deux tirages
   * concurrents) inoffensif.
   *
   * Propriété importante à préserver : TOUTE branche de ce callback
   * réécrit la ligne Duel — y compris le cas verdict encore indécidable
   * (mise à jour des seuls compteurs). C'est cette écriture systématique
   * qui, sous isolation Serializable, fait entrer en conflit deux
   * transactions concurrentes touchant le même duel : l'une des deux
   * échoue en P2034 et retente, relisant alors un statut déjà à jour par
   * la première. Rendre cette écriture conditionnelle (« ne rien écrire si
   * rien ne change ») retirerait ce verrou de sérialisation en silence et
   * casserait l'idempotence — ce n'est pas la seule relecture du statut en
   * tête de fonction qui la garantit, c'est la combinaison des deux.
   */
  async #settle(duelId: string, now: Date): Promise<void> {
    const scoring = await this.#scoringConfigRepository.get()

    const outcome = await retryOnSerialization<SettleOutcome>(() =>
      this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: verdict + transfert + détachement d'équipement, motif calqué sur tower.domain#fight
        async (tx) => {
          const duel = await tx.duel.findUnique({ where: { id: duelId } })
          if (!duel || duel.status !== 'ACTIVE') {
            return null
          }
          if (duel.acceptedAt === null) {
            // Défensif : un duel ACTIVE a toujours acceptedAt posé par accept().
            return null
          }

          const [challengerPulls, opponentPulls] = await Promise.all([
            this.#wagerRepository.findPullsSinceInTx(
              tx,
              duel.challengerId,
              duel.acceptedAt,
              duel.pullCount,
            ),
            this.#wagerRepository.findPullsSinceInTx(
              tx,
              duel.opponentId,
              duel.acceptedAt,
              duel.pullCount,
            ),
          ])

          const challengerScore = duelScoreHalfPoints(challengerPulls, scoring)
          const opponentScore = duelScoreHalfPoints(opponentPulls, scoring)

          const verdict = duelVerdict({
            challengerScore,
            opponentScore,
            challengerPulls: challengerPulls.length,
            opponentPulls: opponentPulls.length,
            pullCount: duel.pullCount,
            now,
            deadlineAt: duel.deadlineAt,
          })

          if (verdict === null) {
            // Duel toujours en cours : on met à jour les compteurs pour
            // l'affichage en direct, sans conclure.
            await tx.duel.update({
              where: { id: duel.id },
              data: {
                challengerScore,
                opponentScore,
                challengerPulls: challengerPulls.length,
                opponentPulls: opponentPulls.length,
              },
            })
            return null
          }

          let winnerId: string | null = null
          let loserId: string | null = null
          let loserPulls: PullWithRarity[] = []
          if (verdict === 'CHALLENGER') {
            winnerId = duel.challengerId
            loserId = duel.opponentId
            loserPulls = opponentPulls
          } else if (verdict === 'OPPONENT') {
            winnerId = duel.opponentId
            loserId = duel.challengerId
            loserPulls = challengerPulls
          }
          // TIE : winnerId reste null, loserPulls reste vide — aucun transfert.

          let transferredCount = 0
          if (winnerId !== null && loserId !== null) {
            for (const pull of loserPulls) {
              const transferred = await this.#transferPull(
                tx,
                duel.id,
                loserId,
                winnerId,
                pull,
              )
              if (transferred) {
                transferredCount += 1
              }
            }
          }

          await tx.duel.update({
            where: { id: duel.id },
            data: {
              status: 'SETTLED',
              winnerId,
              settledAt: now,
              challengerScore,
              opponentScore,
              challengerPulls: challengerPulls.length,
              opponentPulls: opponentPulls.length,
            },
          })

          return {
            teamId: duel.teamId,
            challengerId: duel.challengerId,
            opponentId: duel.opponentId,
            winnerId,
            transferredCount,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    if (!outcome) {
      return
    }

    // Après le commit uniquement : un rollback ne doit jamais avoir
    // notifié un transfert de cartes qui n'a pas eu lieu.
    const team = await this.#teamRepository.findById(outcome.teamId)
    const event: DuelSettledEvent = {
      type: 'duel:settled',
      teamId: outcome.teamId,
      duelId,
      winnerId: outcome.winnerId,
      transferredCount: outcome.transferredCount,
    }
    // Les deux duellistes doivent être prévenus même si l'un d'eux a
    // quitté l'équipe entre l'acceptation et le règlement — la spec dit
    // « les deux joueurs ET l'équipe », pas seulement l'équipe.
    const recipientIds = new Set([
      outcome.challengerId,
      outcome.opponentId,
      ...(team?.members.map((m) => m.userId) ?? []),
    ])
    for (const recipientId of recipientIds) {
      this.#wsManager.notify(recipientId, event)
    }
  }

  /**
   * Transfère un tirage du perdant vers le vainqueur. Si le perdant ne
   * possède plus la carte (recyclée entre-temps), ne transfère rien plutôt
   * que d'échouer : le verrou de la tâche 7 rend ce cas improbable, mais un
   * règlement ne doit jamais planter pour ça.
   */
  async #transferPull(
    tx: PrimaTransactionClient,
    duelId: string,
    loserId: string,
    winnerId: string,
    pull: PullWithRarity,
  ): Promise<boolean> {
    const owned = await tx.userCard.findUnique({
      where: {
        userId_cardId_variant: {
          userId: loserId,
          cardId: pull.cardId,
          variant: pull.variant,
        },
      },
    })
    if (!owned) {
      return false
    }

    if (owned.quantity > 1) {
      await tx.userCard.update({
        where: { id: owned.id },
        data: { quantity: { decrement: 1 } },
      })
    } else {
      // Dernière copie : on détache d'abord l'équipement porté par cette
      // carte, DIRECTEMENT via tx. Passer par la méthode publique du
      // domaine équipement ouvrirait sa propre transaction imbriquée, ce
      // qui casserait l'atomicité de tout le transfert.
      await tx.userEquipment.updateMany({
        where: { equippedOnId: owned.id },
        data: { equippedOnId: null },
      })
      await tx.userCard.delete({ where: { id: owned.id } })
    }

    await this.#userCardRepository.upsertInTx(
      tx,
      winnerId,
      pull.cardId,
      pull.variant,
    )

    await tx.duelTransfer.create({
      data: {
        duelId,
        cardId: pull.cardId,
        variant: pull.variant,
        fromUserId: loserId,
        toUserId: winnerId,
      },
    })

    return true
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
