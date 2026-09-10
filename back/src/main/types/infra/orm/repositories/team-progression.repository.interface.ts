import type { PrimaTransactionClient } from '../client'

/**
 * L'état de progression d'une équipe, sans le reste de la ligne `Team`.
 * `xp` est la progression DANS le niveau courant, pas un cumul.
 */
export type TeamProgressRow = {
  level: number
  xp: number
  perkPoints: number
}

/** Une ligne `TeamPerk`. `key` reste une chaîne : la colonne n'est pas un enum. */
export type TeamPerkRow = {
  key: string
  rank: number
}

/** La contribution hebdomadaire d'un membre, pour la table des contributions. */
export type TeamWeeklyRow = {
  userId: string
  points: number
}

export interface ITeamProgressionRepository {
  /**
   * Les identifiants des équipes du joueur. Sert au routage d'un tirage,
   * qui crédite TOUTES ses équipes.
   */
  listTeamIdsForUser(userId: string): Promise<string[]>
  /**
   * Les identifiants des membres d'une équipe, pour la notification
   * post-commit. Une projection, pas la vue complète du dépôt équipe.
   */
  listMemberIdsForTeam(teamId: string): Promise<string[]>
  /**
   * Le joueur est-il membre de cette équipe ? Relu DANS la transaction, et
   * seulement quand l'appelant a nommé l'équipe lui-même (raid, duel,
   * pari). La clé étrangère de `TeamMemberWeekly` pointe vers `User`, pas
   * vers `TeamMember` : sans ce contrôle, un appelant mal branché créerait
   * une ligne hebdomadaire pour un ÉTRANGER à l'équipe, et la faute
   * apparaîtrait bien plus tard sous forme d'un nom inconnu dans la table
   * des contributions plutôt que sous forme d'erreur.
   */
  isMemberInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
  ): Promise<boolean>
  /**
   * Incrémente les points hebdomadaires du membre et renvoie son nouveau
   * total. `upsert` sur `[teamId, userId, weekKey]` : la ligne n'existe pas
   * la première fois de la semaine. Seule version EN TRANSACTION — elle est
   * indissociable de la relecture de `Team` qui la PRÉCÈDE.
   */
  addWeeklyPointsInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    userId: string,
    weekKey: string,
    points: number,
  ): Promise<number>
  /**
   * L'état de progression de l'équipe, relu DANS la transaction. C'est
   * cette lecture, suivie de l'écriture inconditionnelle de la même ligne,
   * qui fait échouer en sérialisation deux crédits concurrents plutôt que
   * de leur laisser lire le même niveau et créer deux fois le même point.
   */
  findProgressInTx(
    tx: PrimaTransactionClient,
    teamId: string,
  ): Promise<TeamProgressRow | null>
  /**
   * Écrit `level`, `xp` et `perkPoints`. Toujours les trois, jamais un
   * sous-ensemble : l'écriture doit toucher la ligne sur TOUS les chemins.
   */
  writeProgressInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    progress: TeamProgressRow,
  ): Promise<void>
  listPerks(teamId: string): Promise<TeamPerkRow[]>
  listPerksInTx(
    tx: PrimaTransactionClient,
    teamId: string,
  ): Promise<TeamPerkRow[]>
  upsertPerkRankInTx(
    tx: PrimaTransactionClient,
    teamId: string,
    key: string,
    rank: number,
  ): Promise<void>
  /**
   * Remet tous les rangs de l'équipe à 0. Le remboursement des points est
   * calculé par le domaine à partir des rangs lus dans la MÊME transaction,
   * pas ici : le dépôt ne connaît pas le compteur de points.
   */
  resetPerksInTx(tx: PrimaTransactionClient, teamId: string): Promise<void>
  /** Total de l'équipe pour la semaine. */
  sumWeeklyPoints(teamId: string, weekKey: string): Promise<number>
  /** Le détail par membre, décroissant, pour la table des contributions. */
  listWeeklyPoints(teamId: string, weekKey: string): Promise<TeamWeeklyRow[]>
  /**
   * Le MEILLEUR rang par clé parmi toutes les équipes du joueur, en UNE
   * requête. Jamais la somme : un joueur dans trois équipes prend le
   * meilleur rang de chaque bonus, sinon rejoindre trois équipes
   * deviendrait obligatoire.
   */
  bestPerkRanksForUser(userId: string): Promise<TeamPerkRow[]>
}
