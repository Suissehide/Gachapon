import type {
  Bet,
  BetStatus,
  CardElement,
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

/**
 * Un tirage compte, avec de quoi DESSINER la carte et non seulement
 * l'identifier. `imageKey` est le chemin de stockage, jamais une URL : c'est
 * la couche HTTP qui la construit a la lecture.
 */
export type CountedPullWithCard = {
  /** Identite de la LIGNE de tirage : deux tirages de la meme carte existent. */
  id: string
  cardId: string
  name: string
  /** Nom du set : la carte ne se dessine pas sans sa banniere de famille. */
  setName: string
  rarity: CardRarity
  element: CardElement | null
  imageKey: string | null
  variant: CardVariant
  pulledAt: Date
}

export type DuelWithParties = Duel & {
  challenger: { id: string; username: string; avatar: string | null }
  opponent: { id: string; username: string; avatar: string | null }
  /**
   * Nombre de lignes `DuelTransfer` du duel, servi par un `_count` Prisma.
   * Vaut 0 partout sauf sur un duel SETTLED, ce qui est exact : un duel non
   * regle n'a transfere aucune carte. C'est la SEULE trace durable du
   * nombre de cartes raflees — l'evenement WebSocket `duel:settled` le porte
   * au moment du reglement, puis il disparait.
   */
  _count: { transfers: number }
}

/**
 * Une carte raflee au reglement d'un duel, avec de quoi la DESSINER. Meme
 * forme imbriquee que `ClaimedCard` cote recompenses : le front rend les
 * deux avec `TcgCardFace`, et deux formes differentes pour la meme chose
 * l'auraient oblige a un adaptateur.
 */
export type DuelTransferWithCard = {
  id: string
  variant: CardVariant
  fromUserId: string
  toUserId: string
  card: {
    id: string
    name: string
    rarity: CardRarity
    /** Dessine la pastille d'element sur la carte agrandie, comme en collection. */
    element: CardElement | null
    imageUrl: string | null
    /** Requis par `TcgCardFace`, qui l'affiche en fil d'ariane au-dessus du nom. */
    set: { name: string }
  }
}

/** Un defi en attente, vu depuis le defie : l'equipe et le defieur suffisent. */
export type PendingDuelForOpponent = Duel & {
  team: { id: string; name: string; slug: string; avatar: string | null }
  challenger: { id: string; username: string; avatar: string | null }
}

/**
 * Un duel regle, vu depuis l'un des deux duellistes : les DEUX camps sont
 * necessaires, la notification annonce un verdict entre deux joueurs.
 */
export type SettledDuelForUser = PendingDuelForOpponent & {
  opponent: { id: string; username: string; avatar: string | null }
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
  /**
   * La MEME fenetre que `findPullsSinceInTx`, avec la carte complete, et hors
   * transaction. A n'appeler que sur un duel REGLE : `acceptedAt` est alors
   * fige et la fenetre ne peut plus bouger, donc le verrou de serialisation
   * qui protege l'autre version n'a plus d'objet. Sur un duel en cours, cette
   * lecture pourrait voir un sous-ensemble different de celui que le
   * reglement saisira.
   */
  findCountedPullsWithCard(
    userId: string,
    since: Date,
    take: number,
  ): Promise<CountedPullWithCard[]>
  /**
   * Les duels REGLES recemment ou le joueur etait partie, toutes equipes
   * confondues. Sert la notification de resultat : un spectateur n'y figure
   * pas, seuls les deux duellistes.
   */
  listRecentSettledDuelsForUser(
    userId: string,
    settledAfter: Date,
  ): Promise<SettledDuelForUser[]>
  listTeamDuels(teamId: string): Promise<DuelWithParties[]>
  listRecentSettledDuels(
    teamId: string,
    take: number,
  ): Promise<DuelWithParties[]>
  /** Les cartes raflees sur un duel, dans l'ordre du transfert. */
  listDuelTransfers(duelId: string): Promise<DuelTransferWithCard[]>
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
