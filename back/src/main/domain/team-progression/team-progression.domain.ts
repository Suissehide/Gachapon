import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type {
  TeamLevelUpEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'
import type { IocContainer } from '../../types/application/ioc'
import type { TeamMemberRole } from '../../types/domain/team/team.types'
import type {
  ITeamProgressionDomain,
  TeamAwardResult,
  TeamPerkEffects,
  TeamPerksView,
  TeamPointSource,
} from '../../types/domain/team-progression/team-progression.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  ITeamProgressionRepository,
  TeamPerkRow,
  TeamProgressRow,
  TeamWeeklyRow,
} from '../../types/infra/orm/repositories/team-progression.repository.interface'
import { raidWeekKey } from '../raid/raid-rules'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  applyTeamXp,
  grantablePerkPoints,
  perkEffect,
  TEAM_PERK_KEYS,
  type TeamPerkKey,
  xpForTeamLevel,
} from './team-progression-rules'

/** Les tunables lus par `award`, tous AVANT la transaction. */
const AWARD_CFG_KEYS = [
  'teamPoints.damagePerPoint',
  'teamPoints.duelWon',
  'teamPoints.betWon',
  'teamPoints.perPull',
  'teamLevel.xpBase',
  'teamLevel.xpExp',
  'teamLevel.maxLevel',
  // Les plafonds de RANGS : leur somme borne les points attribuables, le
  // plafond de niveau ne suffit pas (49 niveaux pour 17 rangs).
  'teamPerk.loot.maxRank',
  'teamPerk.raid.maxRank',
  'teamPerk.xp.maxRank',
  'teamPerk.forge.maxRank',
] as const

/** Les tunables nécessaires pour composer une vue complète de l'arbre de bonus. */
const PERK_CFG_KEYS = [
  'teamPerk.loot.perRank',
  'teamPerk.loot.unlockLevel',
  'teamPerk.loot.maxRank',
  'teamPerk.raid.perRank',
  'teamPerk.raid.unlockLevel',
  'teamPerk.raid.maxRank',
  'teamPerk.xp.perRank',
  'teamPerk.xp.unlockLevel',
  'teamPerk.xp.maxRank',
  'teamPerk.forge.perRank',
  'teamPerk.forge.unlockLevel',
  'teamPerk.forge.maxRank',
  'teamLevel.xpBase',
  'teamLevel.xpExp',
  'teamLevel.maxLevel',
] as const

type AwardCfg = Record<(typeof AWARD_CFG_KEYS)[number], number>
type PerkCfg = Record<(typeof PERK_CFG_KEYS)[number], number>

/**
 * Nombre total de rangs qu'une équipe pourra un jour acheter, tous bonus
 * confondus. C'est le dénominateur de `grantablePerkPoints` : depuis que
 * `raid` plafonne à 2 quand les trois autres plafonnent à 5, il ne s'obtient
 * plus en multipliant un plafond commun par quatre.
 */
function rankCapacity(cfg: AwardCfg | PerkCfg): number {
  return TEAM_PERK_KEYS.reduce(
    (sum, key) => sum + cfg[`teamPerk.${key}.maxRank`],
    0,
  )
}

/**
 * Les trois sources dont le barème est un MULTIPLICATEUR d'une quantité
 * brute. Les dégâts de raid sont à part : leur tunable est un diviseur.
 */
const WEIGHT_KEY = {
  DUEL_WON: 'teamPoints.duelWon',
  BET_WON: 'teamPoints.betWon',
  PULL: 'teamPoints.perPull',
} as const

/**
 * Convertit une quantité brute en points d'équipe. C'est le SEUL endroit où
 * les pondérations sont appliquées : les appelants passent des dégâts, un
 * nombre de tirages ou `1`, jamais un nombre déjà pondéré, sinon quatre
 * barèmes se mettent à diverger dès le premier ajustement de config.
 */
function pointsFor(
  source: TeamPointSource,
  amount: number,
  cfg: AwardCfg,
): number {
  if (amount <= 0) {
    return 0
  }
  if (source === 'RAID_DAMAGE') {
    // `damagePerPoint` est un DIVISEUR — « autant de dégâts pour un point ».
    // Le plancher à 1 protège d'une valeur de config à 0 mise à la main.
    const perPoint = Math.max(1, cfg['teamPoints.damagePerPoint'])
    return Math.floor(amount / perPoint)
  }
  return Math.round(amount * cfg[WEIGHT_KEY[source]])
}

/**
 * Compose la vue de l'arbre à partir d'un état de progression et des rangs
 * lus. Les effets passent tous par `perkEffect` : le front ne refait jamais
 * l'arithmétique, et le plancher entier du bonus `raid` reste au même
 * endroit que le reste des règles.
 */
function toPerksView(
  teamId: string,
  progress: TeamProgressRow,
  perks: TeamPerkRow[],
  cfg: PerkCfg,
): TeamPerksView {
  const rankOf = new Map(perks.map((perk) => [perk.key, perk.rank]))
  const atMaxLevel = progress.level >= cfg['teamLevel.maxLevel']
  const need = xpForTeamLevel(
    progress.level,
    cfg['teamLevel.xpBase'],
    cfg['teamLevel.xpExp'],
  )
  return {
    teamId,
    level: progress.level,
    xp: progress.xp,
    xpToNext: atMaxLevel ? 0 : Math.max(0, need - progress.xp),
    perkPoints: progress.perkPoints,
    perks: TEAM_PERK_KEYS.map((key) => {
      const rank = rankOf.get(key) ?? 0
      const unlockLevel = cfg[`teamPerk.${key}.unlockLevel`]
      const maxRank = cfg[`teamPerk.${key}.maxRank`]
      return {
        key,
        rank,
        effect: perkEffect(key, rank, cfg[`teamPerk.${key}.perRank`], maxRank),
        unlockLevel,
        unlocked: progress.level >= unlockLevel,
        maxRank,
      }
    }),
  }
}

export class TeamProgressionDomain implements ITeamProgressionDomain {
  readonly #configService: ConfigServiceInterface
  readonly #postgresOrm: PostgresOrm
  readonly #teamMemberRepository: TeamMemberRepository
  readonly #teamProgressionRepository: ITeamProgressionRepository
  readonly #wsManager: WsManager

  constructor({
    configService,
    postgresOrm,
    teamMemberRepository,
    teamProgressionRepository,
    wsManager,
  }: IocContainer) {
    this.#configService = configService
    this.#postgresOrm = postgresOrm
    this.#teamMemberRepository = teamMemberRepository
    this.#teamProgressionRepository = teamProgressionRepository
    this.#wsManager = wsManager
  }

  /**
   * Crédite des points hebdomadaires au membre et l'XP correspondante à
   * l'équipe. La semaine est CELLE DU RAID (`raidWeekKey`) : un seul lundi
   * de référence dans tout le back, jamais recalculé ailleurs.
   */
  async award(
    userId: string,
    teamId: string | null,
    source: TeamPointSource,
    amount: number,
    now: Date = new Date(),
  ): Promise<TeamAwardResult[]> {
    // Config lue AVANT toute transaction : aucune I/O async supplémentaire
    // ne doit s'y glisser.
    const cfg = await this.#configService.getMany(...AWARD_CFG_KEYS)
    const points = pointsFor(source, amount, cfg)
    if (points <= 0) {
      return []
    }

    // `null` = un tirage : toutes les équipes du joueur, montant PLEIN pour
    // chacune. L'XP d'équipe n'est pas un pot à partager, et un joueur actif
    // profite à chacune de ses équipes.
    const teamIds =
      teamId === null
        ? await this.#teamProgressionRepository.listTeamIdsForUser(userId)
        : [teamId]
    if (teamIds.length === 0) {
      return []
    }
    // Une équipe NOMMÉE par l'appelant n'est pas une équipe prouvée : elle
    // vient d'une URL ou d'une colonne, jamais de l'appartenance du joueur.
    // Elle se vérifie dans la transaction.
    const verifyMembership = teamId !== null

    const weekKey = raidWeekKey(now)
    const results: TeamAwardResult[] = []
    // Séquentiel, pas `Promise.all` : deux transactions sérialisables
    // lancées en parallèle depuis le même appel se disputeraient des lignes
    // voisines et se feraient rejouer l'une l'autre pour rien.
    for (const id of teamIds) {
      const result = await this.#awardToTeam(
        id,
        userId,
        weekKey,
        points,
        cfg,
        verifyMembership,
      )
      if (result !== null) {
        results.push(result)
      }
    }

    await this.#notifyLevelUps(results)
    return results
  }

  /**
   * L'ORDRE des trois écritures/lectures n'est pas cosmétique.
   *
   * La ligne `Team` est lue EN PREMIER, avant l'`upsert` hebdomadaire.
   * `TeamMemberWeekly.teamId` porte une clé étrangère vers `Team` : dans le
   * scénario même que garde le `null` ci-dessous — une équipe dissoute entre
   * la résolution et la transaction — l'`upsert` fait en premier lèverait
   * une violation de clé étrangère, qui n'est PAS une erreur de
   * sérialisation et que `retryOnSerialization` laisse donc remonter telle
   * quelle. Branchée sur le tirage, elle transformerait un tirage réussi en
   * 500 pour le joueur. Lire d'abord rend la garde réelle au lieu de
   * décorative : on sort sans avoir rien écrit, et sans laisser derrière soi
   * une ligne hebdomadaire orpheline d'équipe.
   *
   * `verifyMembership` n'est vrai que quand l'appelant a nommé l'équipe
   * (raid, duel, pari). Sur le chemin du tirage les équipes viennent de
   * `listTeamIdsForUser`, l'appartenance est acquise et la requête serait
   * du gaspillage sur un chemin chaud.
   */
  #awardToTeam(
    teamId: string,
    userId: string,
    weekKey: string,
    points: number,
    cfg: AwardCfg,
    verifyMembership: boolean,
  ): Promise<TeamAwardResult | null> {
    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const progress =
            await this.#teamProgressionRepository.findProgressInTx(tx, teamId)
          if (progress === null) {
            // Équipe dissoute entre la résolution et la transaction. Rien
            // n'a encore été écrit : on sort proprement.
            return null
          }
          if (
            verifyMembership &&
            !(await this.#teamProgressionRepository.isMemberInTx(
              tx,
              teamId,
              userId,
            ))
          ) {
            // Refus franc, pas une ligne silencieuse : la clé étrangère de
            // `TeamMemberWeekly` pointe vers `User` et laisserait passer un
            // étranger, qui referait surface bien plus tard dans la table
            // des contributions de l'équipe.
            throw Boom.forbidden("Ce joueur n'appartient pas à cette équipe.")
          }

          const memberWeekPoints =
            await this.#teamProgressionRepository.addWeeklyPointsInTx(
              tx,
              teamId,
              userId,
              weekKey,
              points,
            )

          const next = applyTeamXp(
            { level: progress.level, xp: progress.xp },
            points,
            {
              xpBase: cfg['teamLevel.xpBase'],
              xpExp: cfg['teamLevel.xpExp'],
              maxLevel: cfg['teamLevel.maxLevel'],
            },
          )
          // Un point qu'aucun bonus ne pourra prendre n'est pas crédité.
          // Les quatre bonus valent 20 rangs en tout et le niveau monte
          // jusqu'à 50 : passé le vingtième point, créditer reviendrait à
          // afficher une pastille et un bouton d'investissement que rien ne
          // peut consommer. Le NIVEAU, lui, continue de monter — c'est
          // l'ancienneté de l'équipe, elle reste affichée.
          //
          // La lecture des rangs n'a lieu QUE sur une montée de niveau :
          // c'est une requête de plus dans une transaction sérialisable, et
          // le chemin chaud (un tirage qui ne franchit aucun seuil) ne doit
          // pas la payer.
          let perkPointsGained = next.perkPointsGained
          if (perkPointsGained > 0) {
            const rows = await this.#teamProgressionRepository.listPerksInTx(
              tx,
              teamId,
            )
            perkPointsGained = grantablePerkPoints(
              perkPointsGained,
              progress.perkPoints,
              rows.reduce((sum, row) => sum + row.rank, 0),
              rankCapacity(cfg),
            )
          }
          const written: TeamProgressRow = {
            level: next.level,
            xp: next.xp,
            perkPoints: progress.perkPoints + perkPointsGained,
          }

          // ÉCRITURE INCONDITIONNELLE, y compris quand le niveau ne bouge
          // pas. Elle a l'air d'un travail mort — elle ne l'est pas : c'est
          // elle qui met la ligne `Team` en conflit sous Serializable et
          // rend utile la relecture ci-dessus. La rendre conditionnelle
          // laisserait deux crédits simultanés lire le même niveau, franchir
          // tous les deux le même seuil et créer DEUX points de bonus pour
          // un seul palier. Ne pas « optimiser ».
          await this.#teamProgressionRepository.writeProgressInTx(
            tx,
            teamId,
            written,
          )

          return {
            teamId,
            points,
            memberWeekPoints,
            level: written.level,
            xp: written.xp,
            perkPoints: written.perkPoints,
            perkPointsGained,
            levelsGained: written.level - progress.level,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }

  /**
   * Strictement APRÈS commit, et par membre — jamais `broadcast`.
   *
   * Le déclencheur est la MONTÉE DE NIVEAU, pas le point de bonus gagné :
   * une équipe qui a déjà rempli ses vingt rangs continue de monter sans
   * recevoir de point (voir `grantablePerkPoints`), et son nouveau niveau
   * doit quand même parvenir à ses membres.
   */
  async #notifyLevelUps(results: TeamAwardResult[]): Promise<void> {
    for (const result of results) {
      if (result.levelsGained <= 0) {
        continue
      }
      const memberIds =
        await this.#teamProgressionRepository.listMemberIdsForTeam(
          result.teamId,
        )
      const event: TeamLevelUpEvent = {
        type: 'team:levelup',
        teamId: result.teamId,
        level: result.level,
        perkPoints: result.perkPoints,
      }
      for (const memberId of memberIds) {
        this.#wsManager.notify(memberId, event)
      }
    }
  }

  async spendPerkPoint(
    teamId: string,
    userId: string,
    key: TeamPerkKey,
  ): Promise<TeamPerksView> {
    await this.#requireRole(
      teamId,
      userId,
      ['OWNER', 'ADMIN'],
      'Seuls le chef et les officiers peuvent investir les points.',
    )
    const cfg = await this.#configService.getMany(...PERK_CFG_KEYS)
    const maxRank = cfg[`teamPerk.${key}.maxRank`]
    const unlockLevel = cfg[`teamPerk.${key}.unlockLevel`]

    const { progress, perks } = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Le compteur de points ET le rang courant sont lus ICI, dans la
          // transaction. Hors d'elle, deux clics simultanés lisent tous deux
          // « un point disponible, rang 2 » et dépensent le même point deux
          // fois pour un seul rang gagné.
          const current =
            await this.#teamProgressionRepository.findProgressInTx(tx, teamId)
          if (current === null) {
            throw Boom.notFound('Équipe introuvable.')
          }
          const rows = await this.#teamProgressionRepository.listPerksInTx(
            tx,
            teamId,
          )
          const rank = rows.find((row) => row.key === key)?.rank ?? 0

          if (current.perkPoints <= 0) {
            throw Boom.conflict('Aucun point de bonus disponible.')
          }
          if (rank >= maxRank) {
            throw Boom.conflict('Ce bonus est déjà au rang maximum.')
          }
          if (current.level < unlockLevel) {
            throw Boom.conflict(
              `Ce bonus se débloque au niveau ${unlockLevel}.`,
            )
          }

          await this.#teamProgressionRepository.upsertPerkRankInTx(
            tx,
            teamId,
            key,
            rank + 1,
          )
          const next: TeamProgressRow = {
            level: current.level,
            xp: current.xp,
            perkPoints: current.perkPoints - 1,
          }
          await this.#teamProgressionRepository.writeProgressInTx(
            tx,
            teamId,
            next,
          )
          const updated = rows
            .filter((row) => row.key !== key)
            .concat({ key, rank: rank + 1 })
          return { progress: next, perks: updated }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    return toPerksView(teamId, progress, perks, cfg)
  }

  /**
   * Le chef SEUL. Gratuit et sans limite : la remise à zéro rend exactement
   * les points dépensés, somme des rangs lue dans la même transaction que
   * l'écriture — jamais un forfait, sinon un reset crée ou détruit des
   * points.
   */
  async resetPerks(teamId: string, userId: string): Promise<TeamPerksView> {
    await this.#requireRole(
      teamId,
      userId,
      ['OWNER'],
      'Seul le chef peut réinitialiser les bonus.',
    )
    const cfg = await this.#configService.getMany(...PERK_CFG_KEYS)

    const progress = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const current =
            await this.#teamProgressionRepository.findProgressInTx(tx, teamId)
          if (current === null) {
            throw Boom.notFound('Équipe introuvable.')
          }
          const rows = await this.#teamProgressionRepository.listPerksInTx(
            tx,
            teamId,
          )
          const spent = rows.reduce((sum, row) => sum + row.rank, 0)
          await this.#teamProgressionRepository.resetPerksInTx(tx, teamId)
          const next: TeamProgressRow = {
            level: current.level,
            xp: current.xp,
            perkPoints: current.perkPoints + spent,
          }
          await this.#teamProgressionRepository.writeProgressInTx(
            tx,
            teamId,
            next,
          )
          return next
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    // Tous les rangs valent 0 après la remise à zéro : la vue se compose
    // sans relire quoi que ce soit.
    return toPerksView(teamId, progress, [], cfg)
  }

  /**
   * UNE requête Postgres, et c'est un contrat : cette méthode est lue sur
   * des chemins chauds (régénération de jetons, aperçu des récompenses de
   * campagne, coût d'amélioration). Les tunables viennent du
   * `ConfigService`, servi par Redis. À résoudre une fois par requête HTTP
   * et à passer en paramètre, jamais par élément d'une liste.
   *
   * PORTÉE : `loot`, `xp` et `forge` changent ce que LE JOUEUR gagne — son
   * régen de jetons, son XP de campagne, son coût d'amélioration — donc le
   * meilleur rang parmi SES équipes est la bonne règle : sinon rejoindre
   * plusieurs équipes deviendrait obligatoire pour en profiter pleinement.
   * `raid` n'est PAS dans cette catégorie : son effet se consomme contre le
   * boss d'UNE équipe précise, dont les PV sont calibrés par membre. Le
   * champ `raid` renvoyé ici reste calculé (best-effort, pour un affichage
   * générique du genre « votre meilleur bonus raid »), mais aucun site
   * d'application ne doit s'en servir — `raidAttacksBonusForTeam` est la
   * lecture correcte pour créditer un quota d'attaques.
   */
  /**
   * L'arbre de bonus en LECTURE, composé par le même `toPerksView` que la
   * dépense et la remise à zéro : les quatre bonus sont donc toujours
   * présents, y compris au rang 0 et avant leur niveau de déblocage — un
   * bonus manquant à l'écran serait un trou, pas une information.
   */
  async getPerksView(teamId: string): Promise<TeamPerksView> {
    const [progress, perks, cfg] = await Promise.all([
      this.#teamProgressionRepository.findProgress(teamId),
      this.#teamProgressionRepository.listPerks(teamId),
      this.#configService.getMany(...PERK_CFG_KEYS),
    ])
    if (!progress) {
      throw Boom.notFound('Équipe introuvable')
    }
    return toPerksView(teamId, progress, perks, cfg)
  }

  /**
   * Points hebdomadaires de la SEMAINE EN COURS : le total de l'équipe et
   * le détail par membre, en une seule lecture. La semaine est celle du
   * raid (`raidWeekKey`), comme partout ailleurs dans ce domaine.
   */
  async getWeeklyPoints(
    teamId: string,
    now: Date = new Date(),
  ): Promise<{ weekKey: string; total: number; members: TeamWeeklyRow[] }> {
    const weekKey = raidWeekKey(now)
    const members = await this.#teamProgressionRepository.listWeeklyPoints(
      teamId,
      weekKey,
    )
    // Somme en mémoire plutôt qu'un `sumWeeklyPoints` de plus : les lignes
    // sont déjà là, et une seconde agrégation pourrait renvoyer un total qui
    // ne correspond pas au détail affiché juste à côté.
    const total = members.reduce((sum, row) => sum + row.points, 0)
    return { weekKey, total, members }
  }

  async effectsForUser(userId: string): Promise<TeamPerkEffects> {
    const [rows, cfg] = await Promise.all([
      this.#teamProgressionRepository.bestPerkRanksForUser(userId),
      this.#configService.getMany(
        'teamPerk.loot.perRank',
        'teamPerk.loot.maxRank',
        'teamPerk.raid.perRank',
        'teamPerk.raid.maxRank',
        'teamPerk.xp.perRank',
        'teamPerk.xp.maxRank',
        'teamPerk.forge.perRank',
        'teamPerk.forge.maxRank',
      ),
    ])
    const rankOf = new Map(rows.map((row) => [row.key, row.rank]))
    const effects = {} as TeamPerkEffects
    for (const key of TEAM_PERK_KEYS) {
      effects[key] = perkEffect(
        key,
        rankOf.get(key) ?? 0,
        cfg[`teamPerk.${key}.perRank`],
        cfg[`teamPerk.${key}.maxRank`],
      )
    }
    return effects
  }

  /**
   * L'effet du bonus `raid`, scopé à UNE équipe précise — jamais au
   * meilleur rang parmi les équipes du joueur.
   *
   * Les trois autres bonus (`loot`, `xp`, `forge`) changent ce qu'UN JOUEUR
   * gagne, et `effectsForUser` a raison de prendre son meilleur rang : son
   * régen de jetons ou son XP de campagne n'appartiennent qu'à lui. `raid`
   * change ce qu'UNE ÉQUIPE affronte — son quota d'attaques mord sur les PV
   * d'un boss calibrés par membre pour CETTE équipe. Lu par
   * `bestPerkRanksForUser`, un joueur au rang 5 dans une équipe A
   * apporterait deux attaques en plus sur le boss d'une équipe B qui n'a
   * jamais investi un point — une ressource achetée par une équipe qui
   * fuit vers le contenu d'une autre. D'où une lecture scopée à l'équipe
   * attaquée, pas au joueur qui attaque.
   *
   * UNE requête Postgres (`listPerks`, déjà utilisée en lecture non
   * transactionnelle ailleurs) + une lecture de config servie par Redis —
   * même profil de coût que `effectsForUser`.
   */
  async raidAttacksBonusForTeam(teamId: string): Promise<number> {
    const [rows, cfg] = await Promise.all([
      this.#teamProgressionRepository.listPerks(teamId),
      this.#configService.getMany(
        'teamPerk.raid.perRank',
        'teamPerk.raid.maxRank',
      ),
    ])
    const rank = rows.find((row) => row.key === 'raid')?.rank ?? 0
    return perkEffect(
      'raid',
      rank,
      cfg['teamPerk.raid.perRank'],
      cfg['teamPerk.raid.maxRank'],
    )
  }

  /**
   * Un non-membre reçoit le MÊME refus qu'un membre au rôle insuffisant :
   * l'appartenance à une équipe n'a pas à fuir par le message d'erreur.
   */
  async #requireRole(
    teamId: string,
    userId: string,
    roles: TeamMemberRole[],
    message: string,
  ): Promise<void> {
    const member = await this.#teamMemberRepository.findByTeamAndUser(
      teamId,
      userId,
    )
    if (member === null || !roles.includes(member.role)) {
      throw Boom.forbidden(message)
    }
  }
}
