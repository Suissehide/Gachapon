import Boom from '@hapi/boom'

import type {
  CardVariant,
  Duel,
  DuelStatus,
} from '../../../generated/client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  DuelView,
  IBetDomain,
  IDuelDomain,
  PendingDuelView,
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
import type { ITeamProgressionDomain } from '../../types/domain/team-progression/team-progression.domain.interface'
import type { Logger } from '../../types/utils/logger'
import type {
  DuelProposedEvent,
  DuelSettledEvent,
  DuelUpdateEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'
import { retryOnSerialization } from '../shared/retry-serialization'
import { betToView } from './bet.domain'
import { duelScoreHalfPoints, duelVerdict } from './wager-rules'

const HOUR_MS = 60 * 60 * 1000

// Nombre de duels réglés récents renvoyés par la lecture d'équipe.
const RECENT_SETTLED_DUELS = 20

// Idem pour les paris tranchés (gagnés, perdus ou expirés — un pari expiré
// est un pari remboursé, et le parieur doit pouvoir le constater).
const RECENT_SETTLED_BETS = 20

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
  readonly #betDomain: IBetDomain
  readonly #userCardRepository: IUserCardRepository
  readonly #scoringConfigRepository: IScoringConfigRepository
  readonly #postgresOrm: PostgresOrm
  readonly #wsManager: WsManager
  readonly #logger: Logger
  readonly #teamProgressionDomain: ITeamProgressionDomain

  constructor({
    configService,
    teamRepository,
    teamMemberRepository,
    wagerRepository,
    betDomain,
    userCardRepository,
    scoringConfigRepository,
    postgresOrm,
    wsManager,
    logger,
    teamProgressionDomain,
  }: IocContainer) {
    this.#configService = configService
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#wagerRepository = wagerRepository
    this.#betDomain = betDomain
    this.#userCardRepository = userCardRepository
    this.#scoringConfigRepository = scoringConfigRepository
    this.#postgresOrm = postgresOrm
    this.#wsManager = wsManager
    this.#logger = logger
    this.#teamProgressionDomain = teamProgressionDomain
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

    const opponentName = opponentMember.user?.username ?? 'Ce joueur'

    // Config lue AVANT la transaction sérialisable : aucune I/O async
    // supplémentaire ne doit s'y glisser.
    const cfg = await this.#configService.getMany('duel.pullCount')

    const duel = await retryOnSerialization<Duel>(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Les deux plafonds « un seul duel ouvert » sont relus ICI, pas
          // avant : hors transaction, deux propositions simultanées lisent
          // toutes deux « aucun duel ouvert » et créent toutes deux, laissant
          // un joueur avec deux duels actifs — et un seul tirage tombant dans
          // les deux fenêtres lui serait alors saisi DEUX fois. Sous
          // Serializable ces lectures sont des prédicats que l'insertion qui
          // suit contredit : la seconde transaction échoue en P2034,
          // `retryOnSerialization` la rejoue, et elle voit alors le duel
          // adverse. Même motif que `BetDomain#place`.
          const [challengerOpen, opponentOpen] = await Promise.all([
            this.#wagerRepository.findOpenDuelForUserInTx(tx, challengerId),
            this.#wagerRepository.findOpenDuelForUserInTx(tx, opponentId),
          ])
          if (challengerOpen) {
            throw Boom.conflict('Tu as déjà un duel en cours')
          }
          if (opponentOpen) {
            throw Boom.conflict(`${opponentName} a déjà un duel en cours`)
          }

          return this.#wagerRepository.createDuelInTx(tx, {
            teamId,
            challengerId,
            opponentId,
            pullCount: cfg['duel.pullCount'],
          })
        },
        { isolationLevel: 'Serializable' },
      ),
    )

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
   *
   * Le contrôle `PENDING` est fait DEUX fois : une fois à la lecture pour
   * répondre proprement au cas courant, une seconde fois dans le `where` de
   * l'écriture (voir `#writeIfPending`). Sans cette seconde, une annulation
   * du défieur concurrente d'une acceptation laisserait, selon
   * l'entrelacement, un duel annulé passer ACTIVE — verrouillant les cartes
   * des deux joueurs et saisissant celles du perdant.
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
      // Conditionnel lui aussi : un duel qui vient d'être annulé ou refusé
      // ne doit pas être réécrit EXPIRED par-dessus.
      await this.#postgresOrm.prisma.duel.updateMany({
        where: { id: duel.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      })
      throw Boom.conflict('Le délai pour accepter ce duel est dépassé')
    }

    const deadlineAt = new Date(
      now.getTime() + cfg['duel.deadlineHours'] * HOUR_MS,
    )
    await this.#writeIfPending(
      duel.id,
      { status: 'ACTIVE', acceptedAt: now, deadlineAt },
      "Trop tard : ce duel n'est plus en attente d'acceptation",
    )
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après acceptation')
    }

    this.#notifyDuelUpdate(team, updated)

    return this.#toView(updated, userId)
  }

  /**
   * Diffuse l'etat d'un duel a TOUS les membres de l'equipe, pas aux seuls
   * duellistes : le panneau de l'equipe montre les duels des autres, et un
   * spectateur qui garderait une ligne PENDING perimee la verrait avec des
   * boutons morts.
   *
   * Appele par accept, decline et cancel. Les trois portent le meme
   * evenement `duel:update` — seul le statut change — donc le front n'a
   * qu'un cas a traiter pour les trois sorties de l'etat PENDING.
   */
  #notifyDuelUpdate(team: TeamWithMembers, duel: DuelWithParties): void {
    const event: DuelUpdateEvent = {
      type: 'duel:update',
      teamId: team.id,
      duelId: duel.id,
      status: duel.status,
      challengerScore: duel.challengerScore / 2,
      opponentScore: duel.opponentScore / 2,
      challengerPulls: duel.challengerPulls,
      opponentPulls: duel.opponentPulls,
      pullCount: duel.pullCount,
    }
    for (const member of team.members) {
      this.#wsManager.notify(member.userId, event)
    }
  }

  /** Seul l'adversaire peut refuser, uniquement tant que le duel est PENDING. */
  async decline(teamId: string, duelId: string, userId: string): Promise<DuelView> {
    const team = await this.#requireMembership(teamId, userId)
    const duel = await this.#getTeamDuel(teamId, duelId)

    if (duel.opponentId !== userId) {
      throw Boom.forbidden('Seul le joueur défié peut refuser ce duel')
    }
    if (duel.status !== 'PENDING') {
      throw Boom.conflict("Ce duel n'est plus en attente d'acceptation")
    }

    await this.#writeIfPending(
      duel.id,
      { status: 'DECLINED' },
      "Trop tard : ce duel n'est plus en attente d'acceptation",
    )
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après refus')
    }
    this.#notifyDuelUpdate(team, updated)
    return this.#toView(updated, userId)
  }

  /** Seul le défieur peut annuler, uniquement tant que le duel est PENDING. */
  async cancel(teamId: string, duelId: string, userId: string): Promise<DuelView> {
    const team = await this.#requireMembership(teamId, userId)
    const duel = await this.#getTeamDuel(teamId, duelId)

    if (duel.challengerId !== userId) {
      throw Boom.forbidden('Seul le défieur peut annuler ce duel')
    }
    if (duel.status !== 'PENDING') {
      throw Boom.conflict("Ce duel n'est plus en attente d'acceptation")
    }

    await this.#writeIfPending(
      duel.id,
      { status: 'CANCELLED' },
      'Trop tard : ce duel n\'est plus annulable',
    )
    const updated = await this.#wagerRepository.findDuelById(duel.id)
    if (!updated) {
      throw Boom.badImplementation('Duel introuvable juste après annulation')
    }
    this.#notifyDuelUpdate(team, updated)
    return this.#toView(updated, userId)
  }

  /**
   * Expire d'abord les PENDING hors délai d'acceptation, règle ensuite les
   * ACTIVE dont l'échéance est passée (second déclencheur du règlement,
   * avec le tirage — sans lui un duel où les deux joueurs ont cessé de
   * tirer resterait ACTIVE indéfiniment), puis renvoie la vue.
   *
   * Les PARIS périmés sont réglés ici pour exactement la même raison, et
   * elle est plus lourde de conséquences : le règlement d'un pari est
   * déclenché par les tirages de la CIBLE. Une cible qui cesse de jouer
   * laisserait la mise du parieur débitée sans que rien ne vienne jamais la
   * rembourser. Cette lecture est le seul chemin qui rend l'échéance
   * effective.
   */
  async listForTeam(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<WagersView> {
    await this.#requireMembership(teamId, userId)

    // Règlement paresseux AVANT toute lecture de la vue : un duel ou un
    // pari périmé doit avoir été tranché quand la vue se construit.
    await this.#settleStaleForTeam(teamId, now)

    const [duels, settledDuels, bets, settledBets, cfg] = await Promise.all([
      this.#wagerRepository.listTeamDuels(teamId),
      this.#wagerRepository.listRecentSettledDuels(
        teamId,
        RECENT_SETTLED_DUELS,
      ),
      this.#wagerRepository.listTeamBets(teamId, ['ACTIVE']),
      this.#wagerRepository.listRecentSettledBets(teamId, RECENT_SETTLED_BETS),
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

    // Lu APRES le règlement paresseux ci-dessus : un duel qui vient de
    // passer SETTLED dans cet appel ne doit plus apparaître comme verrou.
    const engagedKeys = await this.listEngagedCardKeysInTx(
      this.#postgresOrm.prisma,
      userId,
    )
    // La variante est DÉLIBÉRÉMENT retirée ici. Le verrou, lui, porte bien
    // sur la paire `${cardId}:${variant}` (voir `assertCardNotEngagedInTx`) :
    // c'est seulement le badge de la collection qui retombe sur la carte,
    // donc qui signale « engagée » sur les trois variantes alors qu'une
    // seule l'est. Choix assumé — le badge est un avertissement AVANT
    // tentative, et un avertissement trop large fait perdre un clic là où un
    // avertissement manquant fait perdre une action. Rendre le badge exact
    // demanderait de porter la variante jusqu'à l'API et la vue collection.
    const engagedCardIds = [
      ...new Set(
        [...engagedKeys].map((key) => key.slice(0, key.indexOf(':'))),
      ),
    ]

    return {
      duels: duels
        .filter((d) => d.status !== 'SETTLED')
        .map((d) => this.#toView(d, userId)),
      settledDuels: settledDuels.map((d) => this.#toView(d, userId)),
      // Lus APRES le règlement paresseux ci-dessus : un pari qui vient
      // d'expirer a déjà quitté `bets` pour `settledBets`.
      bets: bets.map((b) => betToView(b, userId)),
      settledBets: settledBets.map((b) => betToView(b, userId)),
      engagedCardIds,
    }
  }

  /**
   * Déclenché après chaque tirage : règle tous les duels ACTIVE où le
   * joueur est partie. Aucun état de progression n'est stocké — chaque
   * appel relit les tirages depuis GachaPull et recalcule tout, ce qui
   * rend l'opération idempotente et sûre à rejouer.
   *
   * Même confinement par duel qu'au chemin de lecture
   * (`#settleStaleForTeam`) : un duel qui échoue de façon déterministe ne
   * doit pas faire avorter la boucle et priver de règlement tous les duels
   * suivants du joueur, à chaque tirage. L'échec est journalisé.
   */
  /**
   * Les defis en attente de la reponse du joueur, toutes equipes confondues.
   *
   * La fenetre est bornee par `createdAt`, pas par le statut : un PENDING
   * dont le delai est passe reste PENDING en base — l'expiration n'est
   * ecrite que par `accept` ou par `listForTeam`, tous deux lies a UNE
   * equipe. Rien ne garantit donc qu'un defi mort ait deja ete reecrit quand
   * la pastille interroge cette route ; on l'ecarte a la lecture.
   *
   * Volontairement en lecture seule : cette route est appelee depuis la
   * navbar, sur toutes les pages. Y greffer le reglement paresseux ferait
   * ecrire en base a chaque affichage.
   */
  async listPendingForOpponent(
    userId: string,
    now: Date = new Date(),
  ): Promise<PendingDuelView[]> {
    const cfg = await this.#configService.getMany('duel.acceptHours')
    const acceptMs = cfg['duel.acceptHours'] * HOUR_MS
    const duels = await this.#wagerRepository.listPendingDuelsForOpponent(
      userId,
      new Date(now.getTime() - acceptMs),
    )
    return duels.map((duel) => ({
      id: duel.id,
      teamId: duel.teamId,
      team: duel.team,
      challenger: duel.challenger,
      pullCount: duel.pullCount,
      createdAt: duel.createdAt.toISOString(),
      expiresAt: new Date(duel.createdAt.getTime() + acceptMs).toISOString(),
    }))
  }

  async settleForUser(userId: string, now: Date = new Date()): Promise<void> {
    const activeDuels = await this.#wagerRepository.listActiveDuelsForUser(
      userId,
    )
    for (const duel of activeDuels) {
      try {
        await this.#settle(duel.id, now)
      } catch (err) {
        this.#logger.error(
          `Règlement du duel ${duel.id} échoué (joueur ${userId}) : ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  /**
   * Verrou des cartes engagées (tâche 7) : les clés `${cardId}:${variant}`
   * des tirages COMPTÉS (mêmes appel et arguments que `#settle` —
   * `findPullsSinceInTx(tx, userId, duel.acceptedAt, duel.pullCount)`) de
   * chaque duel ACTIVE où le joueur est partie. C'est ce même sous-ensemble
   * que le règlement saisira chez le perdant ; verrouiller autre chose
   * protégerait les mauvaises cartes.
   */
  async listEngagedCardKeysInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Set<string>> {
    const activeDuels = await this.#wagerRepository.listActiveDuelsForUserInTx(
      tx,
      userId,
    )
    const keys = new Set<string>()
    for (const duel of activeDuels) {
      if (duel.acceptedAt === null) {
        // Défensif, symétrique au skip de #settle : un duel ACTIVE a
        // toujours acceptedAt posé par accept().
        continue
      }
      const pulls = await this.#wagerRepository.findPullsSinceInTx(
        tx,
        userId,
        duel.acceptedAt,
        duel.pullCount,
      )
      for (const pull of pulls) {
        keys.add(`${pull.cardId}:${pull.variant}`)
      }
    }
    return keys
  }

  async assertCardNotEngagedInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<void> {
    const engagedKeys = await this.listEngagedCardKeysInTx(tx, userId)
    if (engagedKeys.has(`${cardId}:${variant}`)) {
      throw Boom.conflict('Carte engagée dans un duel en cours')
    }
  }

  /**
   * Écriture CONDITIONNELLE : la ligne n'est touchée que si elle est encore
   * PENDING au moment du `UPDATE`, et le perdant de la course reçoit un
   * conflit explicite plutôt qu'un succès silencieux.
   *
   * `accept`, `decline` et `cancel` lisent le duel, vérifient son statut,
   * puis écrivent — trois instructions non sérialisées. La course n'a rien
   * d'adversarial : le défieur annule pendant que l'adversaire accepte.
   * Selon l'entrelacement, un duel annulé passait ACTIVE (verrouillant les
   * cartes des deux joueurs, puis saisissant celles du perdant), ou une
   * acceptation répondait 200 avant de s'évaporer. Deux acceptations
   * concurrentes réussissaient toutes les deux, la seconde réécrivant
   * `acceptedAt` — donc changeant quelles cartes sont comptées et
   * saisissables.
   */
  async #writeIfPending(
    duelId: string,
    data: {
      status: DuelStatus
      acceptedAt?: Date
      deadlineAt?: Date
    },
    // Le message est passé par l'appelant : « n'est plus en attente
    // d'acceptation » n'a aucun sens pour le DÉFIEUR qui annule — lui
    // n'attendait rien, il retirait son défi.
    conflictMessage: string,
  ): Promise<void> {
    const { count } = await this.#postgresOrm.prisma.duel.updateMany({
      where: { id: duelId, status: 'PENDING' },
      data,
    })
    if (count === 0) {
      throw Boom.conflict(conflictMessage)
    }
  }

  /**
   * Règle les duels ET les paris périmés d'une équipe, un par un et chacun
   * dans son propre try/catch : contrairement au déclencheur au tirage,
   * cette lecture ne doit pas échouer pour toute l'équipe parce qu'un seul
   * règlement stale échoue (un P2034 qui survit à tous les retries, par
   * exemple) — même intention que le hook `POST /pulls`
   * (`void ... .catch(...)`), appliquée ici à une boucle plutôt qu'à un
   * fire-and-forget.
   */
  async #settleStaleForTeam(teamId: string, now: Date): Promise<void> {
    const stale = await this.#wagerRepository.listStaleForTeam(teamId, now)
    await this.#settleEach(teamId, stale.duelIds, stale.betIds, now)
  }

  /**
   * Règlement EXHAUSTIF des enjeux d'une équipe : tous ses duels ACTIVE et
   * tous ses paris ACTIVE, pas seulement ceux dont l'échéance est passée.
   *
   * Sert AVANT la suppression d'une équipe (`TeamDomain#deleteTeam`). Le
   * règlement est paresseux — un pari ne se tranche qu'au tirage suivant de
   * la cible ou à la lecture de la vue d'équipe — si bien qu'un enjeu dont
   * l'issue est DÉJÀ déterminée peut dormir en ACTIVE indéfiniment. Fermer
   * l'équipe sans cette passe rembourserait un pari en réalité perdu (la
   * cible a tiré puis s'est arrêtée, l'échéance est passée : c'est
   * exactement l'option gratuite que `betVerdict` ferme, restaurée à
   * l'échelle de la suppression d'équipe et sous le contrôle du
   * propriétaire), paierait la seule mise là où un pari déjà gagnant doit
   * `mise × cote`, et annulerait un duel périmé dont les cartes sont dues
   * au vainqueur — alors que le propriétaire est souvent l'un des deux
   * duellistes.
   *
   * On ne se limite pas à `listStaleForTeam` (le chemin de lecture, qui ne
   * regarde que `deadlineAt`) : un pari déjà qualifiant ou une fenêtre déjà
   * pleine se tranchent AVANT l'échéance, et leur règlement fire-and-forget
   * a pu échouer. `#settle` et `settleBet` sont idempotents et ne
   * réécrivent qu'un compteur quand le verdict reste indécidable : les
   * appeler sur tout ce qui est ACTIVE est sans risque, et la suppression
   * d'équipe est assez rare pour en payer le coût.
   */
  async settleTeamWagers(teamId: string, now: Date = new Date()): Promise<void> {
    const [duels, bets] = await Promise.all([
      this.#wagerRepository.listTeamDuels(teamId),
      this.#wagerRepository.listTeamBets(teamId, ['ACTIVE']),
    ])
    await this.#settleEach(
      teamId,
      duels.filter((d) => d.status === 'ACTIVE').map((d) => d.id),
      bets.map((b) => b.id),
      now,
    )
  }

  /**
   * Un par un, et chacun dans son propre try/catch : un règlement qui
   * échoue de façon déterministe ne doit pas priver de règlement tous les
   * suivants — même intention que le hook `POST /pulls`
   * (`void ... .catch(...)`), appliquée à une boucle plutôt qu'à un
   * fire-and-forget. L'échec est journalisé, jamais avalé.
   */
  async #settleEach(
    teamId: string,
    duelIds: string[],
    betIds: string[],
    now: Date,
  ): Promise<void> {
    for (const duelId of duelIds) {
      try {
        await this.#settle(duelId, now)
      } catch (err) {
        this.#logger.error(
          `Règlement du duel ${duelId} échoué (equipe ${teamId}) : ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
    for (const betId of betIds) {
      try {
        await this.#betDomain.settleBet(betId, now)
      } catch (err) {
        this.#logger.error(
          `Règlement du pari ${betId} échoué (equipe ${teamId}) : ${err instanceof Error ? err.message : String(err)}`,
        )
      }
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

    // Le vainqueur SEUL touche des points d'équipe ; le perdant, rien — une
    // égalité (`winnerId === null`) ne crédite personne non plus. Comme les
    // autres hooks de cette méthode, un échec ne doit jamais remonter :
    // le règlement du duel lui-même est déjà acquis.
    if (outcome.winnerId !== null) {
      void this.#teamProgressionDomain
        .award(outcome.winnerId, outcome.teamId, 'DUEL_WON', 1)
        .catch((err) =>
          this.#logger.error(
            `Crédit des points d'équipe échoué (duel ${duelId}) : ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
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
      // ...et on retire l'identifiant de l'équipe de combat, DANS la même
      // transaction. Le tableau `combatTeam` porte des identifiants de
      // UserCard : sans ce nettoyage il garde une référence morte, que la
      // lecture d'équipe filtre en silence — l'équipe du perdant rétrécit
      // sans qu'il en soit prévenu. Le recyclage a la même propriété, mais
      // il est volontaire ; perdre un duel ne l'est pas.
      await this.#pruneFromCombatTeam(tx, loserId, owned.id)
    }

    await this.#userCardRepository.upsertInTx(
      tx,
      winnerId,
      pull.cardId,
      pull.variant,
    )

    // Trace d'audit. AUCUN code ne relit `DuelTransfer` aujourd'hui — c'est
    // voulu, et ce n'est pas une raison de supprimer l'écriture : un
    // transfert de cartes est définitif, et sans cette ligne il ne reste
    // aucune trace de QUELLE carte est passée de qui à qui (le duel ne garde
    // qu'un vainqueur et un compte). C'est ce qui permet de répondre à une
    // réclamation ou de défaire un règlement fautif.
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

  /**
   * Retire un UserCard supprimé de l'équipe de combat de son ancien
   * propriétaire. Lecture puis réécriture du tableau complet : Postgres ne
   * sait pas retirer un élément d'un `text[]` par valeur via Prisma, et on
   * est déjà dans la transaction du transfert.
   */
  async #pruneFromCombatTeam(
    tx: PrimaTransactionClient,
    userId: string,
    userCardId: string,
  ): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { combatTeam: true },
    })
    if (!user || !user.combatTeam.includes(userCardId)) {
      return
    }
    await tx.user.update({
      where: { id: userId },
      data: { combatTeam: user.combatTeam.filter((id) => id !== userCardId) },
    })
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
