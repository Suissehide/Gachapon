import Boom from '@hapi/boom'

import type { Bet, CardRarity } from '../../../generated/client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  BetQuote,
  BetView,
  IBetDomain,
} from '../../types/domain/wagers/wagers.domain.interface'
import type { TeamWithMembers } from '../../types/domain/team/team.types'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { IUserBoostRepository } from '../../types/infra/orm/repositories/user-boost.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type {
  BetWithParties,
  IWagerRepository,
} from '../../types/infra/orm/repositories/wager.repository.interface'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { BetPlacedEvent, WsManager } from '../../interfaces/ws/ws-manager'
import { effectivePityThreshold } from '../gacha/gacha.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  betMultiplier,
  rarityAtLeastProbability,
  windowProbability,
} from './wager-rules'

const HOUR_MS = 60 * 60 * 1000

type BetCfg = {
  pullWindow: number
  minStake: number
  maxStake: number
  houseFeePct: number
  deadlineHours: number
  maxOpenPerBettor: number
  maxOpenPerTarget: number
  pityThreshold: number
}

/**
 * Vue publique d'un pari. Exportée pour que `DuelDomain#listForTeam`, qui
 * assemble l'unique `WagersView` de l'équipe, puisse la produire sans
 * dépendre de `BetDomain` (ce qui créerait un cycle d'injection).
 */
export function betToView(bet: BetWithParties, userId: string): BetView {
  const myRole =
    bet.bettorId === userId
      ? 'BETTOR'
      : bet.targetId === userId
        ? 'TARGET'
        : 'SPECTATOR'
  return {
    id: bet.id,
    status: bet.status,
    bettor: {
      id: bet.bettor.id,
      username: bet.bettor.username,
      avatar: bet.bettor.avatar,
    },
    target: {
      id: bet.target.id,
      username: bet.target.username,
      avatar: bet.target.avatar,
    },
    stake: bet.stake,
    minRarity: bet.minRarity,
    pullWindow: bet.pullWindow,
    multiplier: bet.multiplier,
    createdAt: bet.createdAt.toISOString(),
    deadlineAt: bet.deadlineAt.toISOString(),
    settledAt: bet.settledAt ? bet.settledAt.toISOString() : null,
    pullsSeen: bet.pullsSeen,
    payout: bet.payout,
    myRole,
  }
}

export class BetDomain implements IBetDomain {
  readonly #configService: ConfigServiceInterface
  readonly #teamRepository: TeamRepository
  readonly #teamMemberRepository: TeamMemberRepository
  readonly #wagerRepository: IWagerRepository
  readonly #cardRepository: ICardRepository
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userBoostRepository: IUserBoostRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm
  readonly #wsManager: WsManager

  constructor({
    configService,
    teamRepository,
    teamMemberRepository,
    wagerRepository,
    cardRepository,
    skillTreeRepository,
    userBoostRepository,
    userRepository,
    postgresOrm,
    wsManager,
  }: IocContainer) {
    this.#configService = configService
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#wagerRepository = wagerRepository
    this.#cardRepository = cardRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#userBoostRepository = userBoostRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
    this.#wsManager = wsManager
  }

  /**
   * Devis indicatif. Il n'engage rien : `place` refait exactement le même
   * calcul avant d'écrire, si bien qu'un devis périmé (la cible a tiré
   * entre-temps, ses boosts ont expiré) ne peut pas être « encaissé » à un
   * prix qui n'a plus cours.
   */
  async quote(
    teamId: string,
    bettorId: string,
    targetId: string,
    minRarity: CardRarity,
  ): Promise<BetQuote> {
    const team = await this.#requireMembership(teamId, bettorId)
    this.#requireValidTarget(team, bettorId, targetId)

    const cfg = await this.#readConfig()
    const { probability, multiplier } = await this.#computeOdds(
      targetId,
      minRarity,
      cfg,
    )
    return {
      multiplier,
      probability,
      pullWindow: cfg.pullWindow,
      minStake: cfg.minStake,
      maxStake: cfg.maxStake,
    }
  }

  /**
   * Place un pari. La cote écrite en base est celle que CE code calcule :
   * la requête n'a aucun champ de cote, et rien de ce que le client envoie
   * n'entre dans `createBet` hors la cible, la rareté visée et la mise.
   */
  async place(
    teamId: string,
    bettorId: string,
    targetId: string,
    minRarity: CardRarity,
    stake: number,
    now: Date = new Date(),
  ): Promise<BetView> {
    const team = await this.#requireMembership(teamId, bettorId)
    this.#requireValidTarget(team, bettorId, targetId)

    // Toute la config est lue AVANT la transaction sérialisable : aucune
    // I/O async supplémentaire ne doit s'y glisser.
    const cfg = await this.#readConfig()

    if (!Number.isInteger(stake)) {
      throw Boom.badRequest('La mise doit être un nombre entier de poussière')
    }
    if (stake < cfg.minStake) {
      throw Boom.badRequest(`La mise minimum est de ${cfg.minStake} poussière`)
    }
    if (stake > cfg.maxStake) {
      throw Boom.badRequest(`La mise maximum est de ${cfg.maxStake} poussière`)
    }

    const [openByBettor, openOnTarget] = await Promise.all([
      this.#wagerRepository.countOpenBetsByBettor(bettorId),
      this.#wagerRepository.countOpenBetsOnTarget(targetId),
    ])
    if (openByBettor >= cfg.maxOpenPerBettor) {
      throw Boom.badRequest(`Tu as déjà ${cfg.maxOpenPerBettor} paris en cours`)
    }
    if (openOnTarget >= cfg.maxOpenPerTarget) {
      const targetName =
        team.members.find((m) => m.userId === targetId)?.user?.username ??
        'Ce joueur'
      throw Boom.badRequest(
        `${targetName} a déjà ${cfg.maxOpenPerTarget} paris ouverts sur lui`,
      )
    }

    // Recalcul serveur : c'est CETTE valeur qui part en base.
    const { multiplier } = await this.#computeOdds(targetId, minRarity, cfg)
    const deadlineAt = new Date(now.getTime() + cfg.deadlineHours * HOUR_MS)

    const created = await retryOnSerialization<Bet>(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const bettor = await this.#userRepository.findByIdOrThrowInTx(
            tx,
            bettorId,
          )
          if (bettor.dust < stake) {
            throw Boom.paymentRequired('Poussière insuffisante')
          }
          await tx.user.update({
            where: { id: bettorId },
            data: { dust: { decrement: stake } },
          })
          return tx.bet.create({
            data: {
              teamId,
              bettorId,
              targetId,
              stake,
              minRarity,
              pullWindow: cfg.pullWindow,
              multiplier,
              deadlineAt,
            },
          })
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    // Les deux parties sont des membres de l'équipe déjà chargée : on
    // reconstitue la vue sans relire le pari.
    const bet: BetWithParties = {
      ...created,
      bettor: this.#party(team, bettorId),
      target: this.#party(team, targetId),
    }

    // Après le commit uniquement : jamais notifier une mise qui a été
    // annulée par un rollback.
    const event: BetPlacedEvent = {
      type: 'bet:placed',
      teamId,
      betId: bet.id,
      bettor: { id: bet.bettor.id, username: bet.bettor.username },
      targetId,
      minRarity: bet.minRarity,
      stake: bet.stake,
      multiplier: bet.multiplier,
      pullWindow: bet.pullWindow,
    }
    this.#wsManager.notify(targetId, event)

    return betToView(bet, bettorId)
  }

  /**
   * Probabilité que la cible sorte au moins `minRarity` dans les
   * `pullWindow` prochains tirages, sur ses vrais poids de tirage (chance du
   * skill tree et boosts actifs compris), puis cote correspondante.
   */
  async #computeOdds(
    targetId: string,
    minRarity: CardRarity,
    cfg: BetCfg,
  ): Promise<{ probability: number; multiplier: number }> {
    const [cards, effects, boosts, target] = await Promise.all([
      this.#cardRepository.findAllActive(),
      this.#skillTreeRepository.getEffectsForUser(targetId),
      this.#userBoostRepository.findActiveByUser(targetId),
      this.#userRepository.findById(targetId),
    ])
    if (!target) {
      throw Boom.notFound('Joueur introuvable')
    }
    if (cards.length === 0) {
      throw Boom.badImplementation('Aucune carte active : cote incalculable')
    }

    const pityThreshold = effectivePityThreshold(
      cfg.pityThreshold,
      effects.pityReduction ?? 0,
    )

    let probability: number
    if (target.pityCurrent + cfg.pullWindow >= pityThreshold) {
      // COURT-CIRCUIT DE PITIÉ — délibéré.
      //
      // La cible atteindra son seuil de pitié à l'intérieur de la fenêtre :
      // un de ces tirages sera forcément un LEGENDARY, donc l'événement
      // « au moins `minRarity` » est déjà acquis, quelle que soit la rareté
      // visée (LEGENDARY est la plus haute, il satisfait toutes les autres).
      // Sans ce court-circuit on vendrait une cote flatteuse (1,38 sur un
      // catalogue courant) sur un résultat certain — la maison paierait un
      // gain quasi garanti à chaque fois. On force donc p = 1, ce qui fait
      // s'effondrer la cote sur la seule marge maison (plancher à 1,00 dans
      // `betMultiplier`) : le pari devient sans intérêt, ce qui est
      // exactement le message à faire passer.
      probability = 1
    } else {
      const weightBoosts = boosts
        .filter((b) => b.weightMultiplier != null && b.weightRarity != null)
        .map((b) => ({
          weightMultiplier: b.weightMultiplier as number,
          weightRarity: b.weightRarity as CardRarity,
        }))
      const q = rarityAtLeastProbability(
        cards,
        effects.luckMultiplier,
        weightBoosts,
        minRarity,
      )
      probability = windowProbability(q, cfg.pullWindow)
    }

    return {
      probability,
      multiplier: betMultiplier(probability, cfg.houseFeePct),
    }
  }

  async #readConfig(): Promise<BetCfg> {
    const c = await this.#configService.getMany(
      'bet.pullWindow',
      'bet.minStake',
      'bet.maxStake',
      'bet.houseFeePct',
      'bet.deadlineHours',
      'bet.maxOpenPerBettor',
      'bet.maxOpenPerTarget',
      'pityThreshold',
    )
    return {
      pullWindow: c['bet.pullWindow'],
      minStake: c['bet.minStake'],
      maxStake: c['bet.maxStake'],
      houseFeePct: c['bet.houseFeePct'],
      deadlineHours: c['bet.deadlineHours'],
      maxOpenPerBettor: c['bet.maxOpenPerBettor'],
      maxOpenPerTarget: c['bet.maxOpenPerTarget'],
      pityThreshold: c.pityThreshold,
    }
  }

  #party(
    team: TeamWithMembers,
    userId: string,
  ): { id: string; username: string; avatar: string | null } {
    const user = team.members.find((m) => m.userId === userId)?.user
    if (!user) {
      throw Boom.badImplementation("Membre d'équipe introuvable")
    }
    return { id: user.id, username: user.username, avatar: user.avatar }
  }

  #requireValidTarget(
    team: TeamWithMembers,
    bettorId: string,
    targetId: string,
  ): void {
    if (targetId === bettorId) {
      throw Boom.badRequest('Tu ne peux pas parier sur toi-même')
    }
    if (!team.members.some((m) => m.userId === targetId)) {
      throw Boom.badRequest("Ce joueur ne fait pas partie de l'équipe")
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
}
