import Boom from '@hapi/boom'

import type { Bet, CardRarity, UserBoost } from '../../../generated/client'
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
import type { Logger } from '../../types/utils/logger'
import type {
  BetWithParties,
  IWagerRepository,
} from '../../types/infra/orm/repositories/wager.repository.interface'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type {
  BetPlacedEvent,
  BetSettledEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'
import { effectivePityThreshold } from '../gacha/gacha.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  betMultiplier,
  betPayout,
  betVerdict,
  firstQualifyingIndex,
  rarityAtLeast,
  RARITY_ORDER,
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
 * Les dimensions des chances de la cible GELÉES au placement et relues
 * telles quelles au règlement (colonnes `placementPity`, `placementLuck`,
 * `placementWeights`).
 *
 * Les recalculer au règlement n'aurait aucun sens : le compteur de pitié a
 * précisément avancé pendant la fenêtre qu'on est en train de régler, la
 * chance du skill tree n'a pas à repeser sur un pari déjà pris, et une
 * rotation de set en cours de fenêtre rognerait rétroactivement le paiement
 * de tous les paris ouverts. Seule la dimension « boosts » a le droit de
 * bouger entre le placement et le règlement — c'est celle que la cible peut
 * acheter après coup, donc la seule que le plafond doit attraper.
 */
type FrozenOdds = {
  pityCurrent: number
  luckMultiplier: number
  weights: RarityWeights | null
}

/**
 * Le seul sous-ensemble d'une carte dont dépend le calcul des chances :
 * `weightFor` ne lit que la rareté et le `dropWeight`.
 */
type OddsCard = { rarity: CardRarity; dropWeight: number }

/** Somme des `dropWeight` du catalogue actif, par rareté. */
type RarityWeights = Partial<Record<CardRarity, number>>

/**
 * Réduit le catalogue à une somme de poids par rareté. `weightFor` est
 * LINÉAIRE en `dropWeight` et ne regarde rien d'autre que la rareté : sommer
 * d'abord puis appliquer chance et boosts donne exactement le même résultat
 * que carte par carte. C'est ce qui permet de geler le catalogue sur la
 * ligne Bet en cinq nombres au lieu de plusieurs centaines de lignes.
 *
 * Une rareté présente au catalogue avec un poids nul est CONSERVÉE : sa
 * présence, et pas son poids, décide si la pitié peut se résoudre
 * (`#pityFiresInWindow`) et si le pool garanti est non vide.
 */
function collapseWeights(cards: OddsCard[]): RarityWeights {
  const weights: RarityWeights = {}
  for (const card of cards) {
    weights[card.rarity] = (weights[card.rarity] ?? 0) + card.dropWeight
  }
  return weights
}

function expandWeights(weights: RarityWeights): OddsCard[] {
  return RARITY_ORDER.filter((rarity) => weights[rarity] !== undefined).map(
    (rarity) => ({ rarity, dropWeight: weights[rarity] as number }),
  )
}

/**
 * Ce que le règlement a effectivement décidé et payé, une fois la
 * transaction COMMITÉE. `null` quand rien n'a été tranché (pari déjà réglé,
 * ou verdict encore indécidable) : dans ce cas aucune notification ne part.
 */
type BetSettleOutcome = {
  teamId: string
  betId: string
  status: 'WON' | 'LOST' | 'EXPIRED'
  payout: number
  bettorId: string
  targetId: string
} | null

/**
 * Ce que le parieur touche selon le verdict :
 *  - WON : la TOTALITÉ de `mise x cote`, mise comprise — elle a été débitée
 *    au placement, la recréditer fait partie du gain ;
 *  - EXPIRED : la mise seule, remboursée à l'identique ;
 *  - LOST : rien, la mise reste à la maison.
 */
function betCredit(
  verdict: 'WON' | 'LOST' | 'EXPIRED',
  stake: number,
  multiplier: number,
): number {
  if (verdict === 'WON') {
    return betPayout(stake, multiplier)
  }
  return verdict === 'EXPIRED' ? stake : 0
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
  readonly #logger: Logger

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
    logger,
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
    this.#logger = logger
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

    const targetName =
      team.members.find((m) => m.userId === targetId)?.user?.username ??
      'Ce joueur'

    // Recalcul serveur : c'est CETTE valeur qui part en base. `pityCurrent`
    // et `luckMultiplier` sont les entrées de ce calcul qu'il faudra rejouer
    // à l'identique au règlement (voir `FrozenOdds`) : on les gèle sur la
    // ligne plutôt que de les relire là-bas, où elles auront bougé.
    const { multiplier, pityCurrent, luckMultiplier, weights } =
      await this.#computeOdds(targetId, minRarity, cfg)
    const deadlineAt = new Date(now.getTime() + cfg.deadlineHours * HOUR_MS)

    const created = await retryOnSerialization<Bet>(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Les deux plafonds sont relus ICI, pas avant : hors transaction,
          // deux placements simultanés lisent tous deux 2 et créent tous deux,
          // laissant 4 paris ouverts pour un plafond de 3. Sous Serializable,
          // ces comptes sont des lectures de prédicat que l'insertion qui suit
          // contredit — la seconde transaction échoue en P2034, `retryOnSerialization`
          // la rejoue, et elle lit alors le compte à jour.
          const [openByBettor, openOnTarget] = await Promise.all([
            this.#wagerRepository.countOpenBetsByBettorInTx(tx, bettorId),
            this.#wagerRepository.countOpenBetsOnTargetInTx(tx, targetId),
          ])
          if (openByBettor >= cfg.maxOpenPerBettor) {
            throw Boom.badRequest(
              `Tu as déjà ${cfg.maxOpenPerBettor} paris en cours`,
            )
          }
          if (openOnTarget >= cfg.maxOpenPerTarget) {
            throw Boom.badRequest(
              `${targetName} a déjà ${cfg.maxOpenPerTarget} paris ouverts sur lui`,
            )
          }

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
              placementPity: pityCurrent,
              placementLuck: luckMultiplier,
              placementWeights: weights,
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
   * Déclenché après chaque tirage de la CIBLE : règle tous ses paris ACTIVE.
   * Rien n'est mémorisé d'un appel à l'autre — chaque règlement relit les
   * tirages depuis GachaPull et recalcule le verdict, ce qui rend l'opération
   * rejouable sans risque.
   *
   * Chaque pari est isolé dans son propre try/catch, comme sur le chemin de
   * lecture (`DuelDomain#settleStaleForTeam`) : sans ce confinement, un seul
   * pari qui échoue de façon déterministe (ligne du parieur supprimée sous le
   * crédit, par exemple) ferait avorter la boucle et affamerait TOUS les
   * paris suivants de cette cible, à chaque tirage, indéfiniment. L'échec est
   * journalisé, jamais avalé en silence.
   */
  async settleForUser(targetId: string, now: Date = new Date()): Promise<void> {
    const bets = await this.#wagerRepository.listActiveBetsForTarget(targetId)
    for (const bet of bets) {
      try {
        await this.#settle(bet.id, now)
      } catch (err) {
        this.#logger.error(
          `Règlement du pari ${bet.id} échoué (cible ${targetId}) : ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  /**
   * Règle un pari nommément. Second déclencheur du règlement, avec le
   * tirage : une cible qui cesse de jouer laisserait sinon la mise du
   * parieur bloquée pour toujours (voir `DuelDomain#listForTeam`).
   */
  async settleBet(betId: string, now: Date = new Date()): Promise<void> {
    await this.#settle(betId, now)
  }

  /**
   * Règle un pari. Tout ce dont le verdict a besoin (fenêtre, rareté visée,
   * cote, échéance) est figé sur la ligne Bet au placement ; ce que la COTE
   * PAYÉE demande en plus (config, catalogue, boosts) est lu AVANT d'ouvrir
   * la transaction, si bien qu'aucune I/O ne peut s'y glisser — même règle
   * que `DuelDomain#settle`, qui lit son ScoringConfig avant de l'ouvrir.
   *
   * PLAFOND DE LA COTE. La cote figée reste un PLAFOND : le parieur ne
   * touche jamais plus que ce qui lui a été annoncé, et jamais moins que ce
   * que valent les chances réelles de la cible. Sans ce plafond, la cible
   * pouvait acheter APRÈS le placement le boost de la boutique qui double le
   * poids des EPIC sur exactement dix tirages — la longueur de la fenêtre —
   * pour 800 poussière : la vraie probabilité doublait pendant que le
   * paiement, lui, restait figé sur l'ancienne. C'est une espérance positive
   * même boost payé, et elle s'amortit sur les trois paris qu'un même joueur
   * peut subir. On plafonne plutôt que d'interdire : bloquer l'achat d'un
   * boost tant qu'un pari court sur vous serait griefable (un pari à 50
   * poussière gèlerait la boutique d'un joueur trois jours), et rembourser
   * les paris à l'achat donnerait à la cible un bouton « annuler ».
   *
   * La toute première lecture DANS la transaction est le statut du pari :
   * s'il n'est plus ACTIVE, on sort sans rien créditer. C'est ce garde-fou —
   * et lui seul — qui rend inoffensif un double déclenchement (tirage +
   * lecture d'équipe, deux tirages concurrents, un rejeu manuel).
   *
   * Propriété importante à préserver : TOUTE branche de ce callback réécrit
   * la ligne Bet, y compris celle où le verdict est encore indécidable (on
   * n'y met à jour que `pullsSeen`). C'est cette écriture systématique qui,
   * sous isolation Serializable, fait entrer en conflit deux transactions
   * concurrentes sur le même pari : l'une échoue en P2034, `retryOnSerialization`
   * la rejoue, et elle relit alors un statut déjà tranché par l'autre.
   * Rendre cette écriture conditionnelle (« ne rien écrire si rien ne
   * change ») retirerait ce verrou en silence, et la relecture du statut
   * n'aurait plus rien pour la déclencher : le pari serait payé deux fois.
   */
  async #settle(betId: string, now: Date): Promise<void> {
    const paidMultiplier = await this.#cappedMultiplier(betId)
    if (paidMultiplier === null) {
      return
    }

    const outcome = await retryOnSerialization<BetSettleOutcome>(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const bet = await tx.bet.findUnique({ where: { id: betId } })
          if (!bet || bet.status !== 'ACTIVE') {
            return null
          }

          // Les `pullWindow` premiers tirages de la cible POSTÉRIEURS au
          // placement : un pari ne peut pas être gagné par une carte déjà
          // sortie avant qu'il ne soit pris.
          const pulls = await this.#wagerRepository.findPullsSinceInTx(
            tx,
            bet.targetId,
            bet.createdAt,
            bet.pullWindow,
          )

          const verdict = betVerdict({
            pulls,
            minRarity: bet.minRarity,
            pullWindow: bet.pullWindow,
            now,
            deadlineAt: bet.deadlineAt,
          })

          if (verdict === null) {
            // Pari toujours en cours : on écrit quand même la ligne (voir la
            // propriété décrite ci-dessus), avec le seul compteur affichable.
            await tx.bet.update({
              where: { id: bet.id },
              data: { pullsSeen: pulls.length },
            })
            return null
          }

          const payout = betCredit(verdict, bet.stake, paidMultiplier)
          if (payout > 0) {
            await tx.user.update({
              where: { id: bet.bettorId },
              data: { dust: { increment: payout } },
            })
          }

          // Sur un gain, `pullsSeen` est le rang du tirage qui a conclu, pas
          // le nombre de tirages lus : c'est ce que le joueur veut lire
          // (« gagné au 3e tirage »).
          const pullsSeen =
            verdict === 'WON'
              ? firstQualifyingIndex(pulls, bet.minRarity) + 1
              : pulls.length

          await tx.bet.update({
            where: { id: bet.id },
            data: { status: verdict, pullsSeen, settledAt: now, payout },
          })

          return {
            teamId: bet.teamId,
            betId: bet.id,
            status: verdict,
            payout,
            bettorId: bet.bettorId,
            targetId: bet.targetId,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    if (!outcome) {
      return
    }

    // Après le commit uniquement : un rollback ne doit jamais avoir annoncé
    // un paiement qui n'a pas eu lieu. Notification par joueur concerné
    // (jamais `broadcast` : le montant regarde le parieur et sa cible).
    const event: BetSettledEvent = {
      type: 'bet:settled',
      teamId: outcome.teamId,
      betId: outcome.betId,
      status: outcome.status,
      payout: outcome.payout,
      bettorId: outcome.bettorId,
      targetId: outcome.targetId,
    }
    this.#wsManager.notify(outcome.bettorId, event)
    if (outcome.targetId !== outcome.bettorId) {
      this.#wsManager.notify(outcome.targetId, event)
    }
  }

  /**
   * `min(cote figée, cote recalculée)` — la cote effectivement payée si le
   * verdict est WON. `null` quand le pari n'est plus à régler : inutile de
   * payer une lecture de catalogue pour une ligne déjà tranchée.
   *
   * Le recalcul repart des valeurs GELÉES au placement (pitié, chance) et ne
   * laisse flotter que les boosts actifs maintenant : voir `FrozenOdds` et le
   * paragraphe « plafond de la cote » de `#settle`.
   *
   * Cette lecture est volontairement HORS transaction, comme toutes les
   * autres I/O du règlement ; la relecture du statut à l'intérieur reste la
   * seule autorité sur « ce pari est-il encore à régler ». Un pari qui
   * passerait ACTIVE -> réglé entre les deux se fait simplement ignorer par
   * cette relecture, sans rien payer.
   */
  async #cappedMultiplier(betId: string): Promise<number | null> {
    const bet = await this.#wagerRepository.findBetById(betId)
    if (!bet || bet.status !== 'ACTIVE') {
      return null
    }
    const cfg = await this.#readConfig()
    const { multiplier } = await this.#computeOdds(
      bet.targetId,
      bet.minRarity,
      // La fenêtre est celle du PARI, pas celle de la config du jour : un
      // `bet.pullWindow` retouché par l'admin ne doit pas déplacer la cote
      // d'un pari déjà pris.
      { ...cfg, pullWindow: bet.pullWindow },
      {
        pityCurrent: bet.placementPity,
        luckMultiplier: bet.placementLuck,
        weights: bet.placementWeights as RarityWeights | null,
      },
    )
    return Math.min(bet.multiplier, multiplier)
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
    // `null` au placement (tout est lu en direct), renseigné au règlement
    // avec les valeurs gelées sur la ligne Bet — voir `FrozenOdds`.
    frozen: FrozenOdds | null = null,
  ): Promise<{
    probability: number
    multiplier: number
    pityCurrent: number
    luckMultiplier: number
    weights: RarityWeights
  }> {
    const [activeCards, effects, boosts, target] = await Promise.all([
      this.#cardRepository.findAllActive(),
      this.#skillTreeRepository.getEffectsForUser(targetId),
      this.#userBoostRepository.findActiveByUser(targetId),
      this.#userRepository.findById(targetId),
    ])
    if (!target) {
      throw Boom.notFound('Joueur introuvable')
    }
    if (activeCards.length === 0) {
      throw Boom.badImplementation('Aucune carte active : cote incalculable')
    }
    // Catalogue gelé s'il y en a un sur la ligne (règlement), catalogue actif
    // sinon (placement, devis, et paris antérieurs à la colonne).
    const weights =
      frozen?.weights == null ? collapseWeights(activeCards) : frozen.weights
    const cards = expandWeights(weights)

    const pityThreshold = effectivePityThreshold(
      cfg.pityThreshold,
      effects.pityReduction ?? 0,
    )
    const window = cfg.pullWindow
    const pityCurrent = frozen === null ? target.pityCurrent : frozen.pityCurrent
    const luckMultiplier =
      frozen === null ? effects.luckMultiplier : frozen.luckMultiplier

    // Les boosts de POIDS de la cible, normalisés pour `weightFor`. Chacun
    // garde son compteur de tirages restants : il décide jusqu'à quel rang
    // de la fenêtre le boost s'applique encore (voir #windowProbability).
    const weightBoosts = boosts
      .filter((b) => b.weightMultiplier != null && b.weightRarity != null)
      .map((b) => ({
        weightMultiplier: b.weightMultiplier as number,
        weightRarity: b.weightRarity as CardRarity,
        pullsRemaining: b.pullsRemaining,
      }))

    const guarantee = this.#guaranteeInWindow(cards, boosts, window)

    let probability: number
    if (this.#pityFiresInWindow(cards, pityCurrent, window, pityThreshold)) {
      // COURT-CIRCUIT DE PITIÉ — délibéré.
      //
      // Le moteur de tirage force un LEGENDARY quand le compteur LU AVANT le
      // tirage a déjà atteint le seuil, et ce compteur avance d'un par
      // tirage non légendaire. Depuis un compteur persisté P, le tirage n° k
      // voit donc P + (k - 1) : un légendaire forcé tombe dans une fenêtre de
      // N tirages si et seulement si `P + N - 1 >= T`. (Écrire `P + N >= T`
      // déclencherait un cran trop tôt et vendrait comme certain, à la cote
      // plancher, un événement qui ne l'est pas — le parieur perdrait sa mise
      // une fois sur trois sans jamais pouvoir gagner plus qu'elle.)
      //
      // Quand la pitié tombe dans la fenêtre, l'événement « au moins
      // `minRarity` » est acquis quelle que soit la rareté visée : LEGENDARY
      // est la plus haute, il satisfait toutes les autres. On force p = 1, ce
      // qui effondre la cote sur la seule marge maison (plancher à 1,00 dans
      // `betMultiplier`) : le pari devient sans intérêt, ce qui est
      // exactement le message à faire passer.
      //
      // La pitié prime sur tout le reste dans le moteur (garantie et boule
      // d'or sont sous `if (!isPityForced)`), d'où ce court-circuit AVANT la
      // boucle : celle-ci n'a plus à connaître que garantie > boule d'or.
      probability = 1
    } else if (this.#guaranteeIsCertain(guarantee, minRarity)) {
      // COURT-CIRCUIT DE GARANTIE — second chemin vers la certitude.
      //
      // Deux conditions, et il faut LES DEUX :
      //
      //  1. le pool garanti (l'ensemble CODÉ EN DUR {EPIC, LEGENDARY} du
      //     moteur — il ne lit PAS `guaranteedRarity` pour choisir le pool)
      //     satisfait la rareté visée, donc `EPIC >= minRarity` ;
      //  2. la rareté PROPRE de la garantie satisfait elle aussi la rareté
      //     visée, donc `guaranteedRarity >= minRarity`.
      //
      // La seconde est ce qui empêche de vendre une certitude désamorçable :
      // le moteur marque un boost `satisfied` dès qu'une carte >= sa propre
      // rareté sort, et un boost satisfait ne se déclenche plus jamais. Avec
      // une garantie RARE et un pari EPIC, un RARE naturel désamorce la
      // garantie sans gagner le pari — la certitude serait fausse. Quand les
      // deux conditions tiennent, soit le boost est désamorcé par une carte
      // qui gagne déjà le pari, soit il se déclenche et livre EPIC ou mieux :
      // le pari est gagné dans les deux cas.
      probability = 1
    } else {
      probability = this.#windowProbability({
        cards,
        luckMultiplier,
        weightBoosts,
        minRarity,
        window,
        goldenBallPct: effects.goldenBallChance ?? 0,
        guarantee,
      })
    }

    return {
      probability,
      multiplier: betMultiplier(probability, cfg.houseFeePct),
      pityCurrent,
      luckMultiplier,
      weights,
    }
  }

  /**
   * `P + N - 1 >= T` : voir la démonstration dans le court-circuit de pitié.
   * La présence d'au moins un LEGENDARY actif est exigée parce que le moteur
   * restreint le pool à cette rareté quand la pitié force — sans légendaire
   * au catalogue le tirage échoue au lieu d'en produire un, et la pitié ne se
   * résout jamais.
   */
  #pityFiresInWindow(
    cards: Array<{ rarity: CardRarity }>,
    pityCurrent: number,
    window: number,
    pityThreshold: number,
  ): boolean {
    if (!cards.some((c) => c.rarity === 'LEGENDARY')) {
      return false
    }
    return pityCurrent + window - 1 >= pityThreshold
  }

  /**
   * Le boost de garantie qui se déclenchera le PLUS TÔT dans la fenêtre, ou
   * `null`. Un boost non satisfait se déclenche au tirage où son compteur
   * vaut exactement 1 : depuis un compteur persisté R, c'est le tirage n° R,
   * donc il tombe dans la fenêtre dès que `1 <= R <= N`. Si plusieurs sont
   * éligibles on retient le premier à s'exercer — c'est lui qui restreint le
   * pool en premier, et le moteur ne peut en déclencher qu'un par tirage.
   *
   * Le pool {EPIC, LEGENDARY} doit être non vide : sinon le moteur retombe
   * sur le catalogue entier (`if (filtered.length > 0)`) et ne garantit rien.
   */
  #guaranteeInWindow(
    cards: Array<{ rarity: CardRarity }>,
    boosts: UserBoost[],
    window: number,
  ): { pullIndex: number; rarity: CardRarity } | null {
    if (!cards.some((c) => rarityAtLeast(c.rarity, 'EPIC'))) {
      return null
    }
    // On ne retient que la garantie la PLUS PROCHE, et c'est correct
    // uniquement parce qu'un joueur ne peut en detenir qu'une : la boutique
    // refuse l'achat quand une garantie est deja active (voir
    // shop.domain.ts, `activeBoosts.some(b => b.guaranteedRarity != null)`).
    // Si une quete ou une recompense se met un jour a en octroyer une
    // seconde, cette cote sous-estimera la probabilite et surpayera le
    // parieur : il faudra alors composer toutes les garanties de la fenetre,
    // pas seulement la premiere.
    let earliest: UserBoost | null = null
    for (const b of boosts) {
      if (
        b.guaranteedRarity != null &&
        !b.satisfied &&
        b.pullsRemaining >= 1 &&
        b.pullsRemaining <= window &&
        (earliest === null || b.pullsRemaining < earliest.pullsRemaining)
      ) {
        earliest = b
      }
    }
    return earliest === null
      ? null
      : {
          pullIndex: earliest.pullsRemaining,
          rarity: earliest.guaranteedRarity as CardRarity,
        }
  }

  #guaranteeIsCertain(
    guarantee: { pullIndex: number; rarity: CardRarity } | null,
    minRarity: CardRarity,
  ): boolean {
    if (guarantee === null) {
      return false
    }
    return (
      rarityAtLeast('EPIC', minRarity) &&
      rarityAtLeast(guarantee.rarity, minRarity)
    )
  }

  /**
   * Probabilité d'au moins un succès sur la fenêtre, tirage par tirage.
   *
   * Trois mécanismes du moteur se superposent ici, dans SON ordre de
   * priorité — la pitié est déjà traitée en amont (elle donne la certitude),
   * restent garantie > boule d'or > tirage ordinaire :
   *
   *  - les boosts de POIDS EXPIRENT : au tirage n° i, seuls s'appliquent ceux
   *    dont il reste au moins `i` tirages. Les replier en une probabilité
   *    unique élevée à la puissance `window` gonflerait un boost court sur
   *    toute la fenêtre, écraserait la cote et sous-paierait le parieur ;
   *  - la BOULE D'OR se joue sur chaque tirage ordinaire avec la probabilité
   *    du skill tree et restreint alors le pool à {RARE, EPIC, LEGENDARY}.
   *    D'où un mélange : γ·q(pool doré) + (1 − γ)·q(catalogue) ;
   *  - la GARANTIE, au tirage n° R, restreint le pool à {EPIC, LEGENDARY} —
   *    mais seulement si elle n'a pas été DÉSAMORCÉE avant. C'est pour cela
   *    que la récurrence porte deux états et non un seul survivant.
   *
   * Les deux états sont « pas encore gagné, garantie intacte » et « pas
   * encore gagné, garantie déjà désamorcée (ou absente) ». Le passage de
   * l'un à l'autre se fait avec `b` = P(rareté dans [rareté de la garantie,
   * minRarity[), c'est-à-dire exactement les cartes qui satisfont le boost
   * SANS gagner le pari. Ignorer cet état-là reviendrait à supposer que la
   * garantie se déclenche toujours : on surestimerait la probabilité, on
   * écraserait la cote, et le court-circuit de certitude ci-dessus (qui
   * existe justement parce qu'une garantie est désamorçable) serait défait
   * dans la foulée.
   *
   * Quand il n'y a ni garantie dans la fenêtre, ni boule d'or, ni boost de
   * poids qui expire, tous les q_i sont égaux et le produit se réduit
   * exactement à `windowProbability(q, window)` — cette branche est explicite
   * pour que le cas courant reste au bit près celui de la primitive
   * unitairement testée.
   */
  #windowProbability(input: {
    cards: OddsCard[]
    luckMultiplier: number
    weightBoosts: Array<{
      weightMultiplier: number
      weightRarity: CardRarity
      pullsRemaining: number
    }>
    minRarity: CardRarity
    window: number
    goldenBallPct: number
    guarantee: { pullIndex: number; rarity: CardRarity } | null
  }): number {
    const {
      cards,
      luckMultiplier,
      weightBoosts,
      minRarity,
      window,
      guarantee,
    } = input
    const golden = Math.min(1, Math.max(0, input.goldenBallPct / 100))

    // Pools restreints du moteur, avec son repli : un filtre qui ne laisse
    // rien est ignoré et le catalogue entier sert.
    const restrict = (floor: CardRarity): OddsCard[] => {
      const filtered = cards.filter((c) => rarityAtLeast(c.rarity, floor))
      return filtered.length > 0 ? filtered : cards
    }
    const goldenPool = restrict('RARE')
    const guaranteePool = restrict('EPIC')

    const boostsAt = (pullIndex: number) =>
      weightBoosts.filter((b) => b.pullsRemaining >= pullIndex)

    const winOn = (pool: OddsCard[], pullIndex: number): number =>
      rarityAtLeastProbability(
        pool,
        luckMultiplier,
        boostsAt(pullIndex),
        minRarity,
      )
    // Cartes qui SATISFONT la garantie sans gagner le pari : elles la
    // désamorcent. Vide (donc 0) dès que la garantie est au moins aussi
    // haute que la rareté visée.
    const defuseOn = (pool: OddsCard[], pullIndex: number): number => {
      if (guarantee === null) {
        return 0
      }
      const atLeastGuarantee = rarityAtLeastProbability(
        pool,
        luckMultiplier,
        boostsAt(pullIndex),
        guarantee.rarity,
      )
      return Math.max(0, atLeastGuarantee - winOn(pool, pullIndex))
    }

    if (
      guarantee === null &&
      golden === 0 &&
      !weightBoosts.some((b) => b.pullsRemaining < window)
    ) {
      return windowProbability(winOn(cards, 1), window)
    }

    let intact = guarantee === null ? 0 : 1
    let defused = guarantee === null ? 1 : 0
    for (let i = 1; i <= window; i += 1) {
      const ordinaryWin =
        golden * winOn(goldenPool, i) + (1 - golden) * winOn(cards, i)
      if (guarantee !== null && i === guarantee.pullIndex) {
        // La garantie prime sur la boule d'or : sur ce tirage-là, l'état
        // intact tire dans le pool garanti, pas dans le mélange doré.
        defused =
          intact * (1 - winOn(guaranteePool, i)) + defused * (1 - ordinaryWin)
        intact = 0
      } else {
        const ordinaryDefuse =
          golden * defuseOn(goldenPool, i) + (1 - golden) * defuseOn(cards, i)
        const nextDefused =
          defused * (1 - ordinaryWin) + intact * ordinaryDefuse
        intact *= Math.max(0, 1 - ordinaryWin - ordinaryDefuse)
        defused = nextDefused
      }
    }
    return 1 - (intact + defused)
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
