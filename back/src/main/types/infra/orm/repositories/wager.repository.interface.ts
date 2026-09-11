import type {
  Bet,
  BetStatus,
  CardRarity,
  CardVariant,
  Duel,
} from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type PullWithRarity = {
  cardId: string
  variant: CardVariant
  rarity: CardRarity
  pulledAt: Date
}

export type DuelWithParties = Duel & {
  challenger: { id: string; username: string; avatar: string | null }
  opponent: { id: string; username: string; avatar: string | null }
}

/** Un defi en attente, vu depuis le defie : l'equipe et le defieur suffisent. */
export type PendingDuelForOpponent = Duel & {
  team: { id: string; name: string; slug: string; avatar: string | null }
  challenger: { id: string; username: string; avatar: string | null }
}

/** Un pari en cours, vu depuis la CIBLE : l'equipe et le parieur suffisent. */
export type ActiveBetOnTarget = Bet & {
  team: { id: string; name: string; slug: string; avatar: string | null }
  bettor: { id: string; username: string; avatar: string | null }
}

export type BetWithParties = Bet & {
  bettor: { id: string; username: string; avatar: string | null }
  target: { id: string; username: string; avatar: string | null }
}

export interface IWagerRepository {
  /**
   * Les `take` premiers tirages du joueur postérieurs à `since`, du plus
   * ancien au plus récent, avec la rareté de la carte. Seule version EN
   * TRANSACTION : c'est ce sous-ensemble qui décide quelles cartes un duel
   * saisit et quel verdict un pari reçoit, il ne se lit jamais hors du
   * verrou de sérialisation qui le rend cohérent avec l'écriture qui suit.
   */
  findPullsSinceInTx(
    tx: PrimaTransactionClient,
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]>
  /**
   * Duel PENDING ou ACTIVE où le joueur est partie, ou null. Sert au « un
   * duel à la fois », et seulement EN TRANSACTION. Hors transaction, deux
   * propositions simultanées lisent toutes deux « aucun duel ouvert » et
   * créent toutes deux : le joueur se retrouve avec deux duels actifs, et un
   * même tirage tombant dans les deux fenêtres lui est saisi deux fois pour
   * un seul tirage compté.
   */
  findOpenDuelForUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Duel | null>
  findDuelById(id: string): Promise<DuelWithParties | null>
  /**
   * Les defis PENDING adresses au joueur, toutes equipes confondues, dont le
   * delai d'acceptation court encore. `createdAfter` n'est pas un confort :
   * l'expiration d'un PENDING est PARESSEUSE — la ligne reste PENDING tant
   * qu'aucun accept ni `listForTeam` ne la reecrit — donc filtrer sur le seul
   * statut ferait trainer un defi mort dans la pastille de notification.
   */
  listPendingDuelsForOpponent(
    userId: string,
    createdAfter: Date,
  ): Promise<PendingDuelForOpponent[]>
  /**
   * Les paris ACTIVE places sur le joueur, toutes equipes confondues, dont
   * l'echeance court encore. `deadlineAfter` repond au meme besoin que
   * `createdAfter` cote duels : le reglement d'un pari est PARESSEUX — il est
   * declenche par un tirage de la cible ou par une lecture de l'equipe — donc
   * un ACTIVE hors echeance le reste en base, et filtrer sur le seul statut
   * ferait trainer un pari mort dans la pastille.
   */
  listActiveBetsOnTarget(
    userId: string,
    deadlineAfter: Date,
  ): Promise<ActiveBetOnTarget[]>
  listTeamDuels(teamId: string): Promise<DuelWithParties[]>
  listRecentSettledDuels(
    teamId: string,
    take: number,
  ): Promise<DuelWithParties[]>
  listActiveDuelsForUser(userId: string): Promise<Duel[]>
  listActiveDuelsForUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Duel[]>
  /**
   * Création EN TRANSACTION, seule version exposée : elle doit partager la
   * transaction sérialisable des deux lectures ci-dessus, sans quoi le
   * plafond « un duel ouvert par joueur » ne tient pas.
   */
  createDuelInTx(
    tx: PrimaTransactionClient,
    data: {
      teamId: string
      challengerId: string
      opponentId: string
      pullCount: number
    },
  ): Promise<Duel>
  /** Paris de l'équipe, filtrés par statut côté SQL quand `statuses` est fourni. */
  listTeamBets(
    teamId: string,
    statuses?: BetStatus[],
  ): Promise<BetWithParties[]>
  listRecentSettledBets(teamId: string, take: number): Promise<BetWithParties[]>
  /**
   * Le pari brut, quel que soit son statut. Sert au calcul de la cote
   * plafonnée AVANT la transaction de règlement : la relecture du statut
   * DANS la transaction reste la seule autorité pour décider de payer.
   */
  findBetById(id: string): Promise<Bet | null>
  listActiveBetsForTarget(targetId: string): Promise<Bet[]>
  /**
   * Paris ouverts du parieur, relus DANS la transaction : seule version
   * exposée. Un compte lu hors transaction laisserait deux placements
   * simultanés franchir le même plafond.
   */
  countOpenBetsByBettorInTx(
    tx: PrimaTransactionClient,
    bettorId: string,
  ): Promise<number>
  countOpenBetsOnTargetInTx(
    tx: PrimaTransactionClient,
    targetId: string,
  ): Promise<number>
  /** Duels et paris dont l'échéance est passée — alimente le règlement paresseux à la lecture. */
  listStaleForTeam(
    teamId: string,
    now: Date,
  ): Promise<{ duelIds: string[]; betIds: string[] }>
}
