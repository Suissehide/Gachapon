import type { TeamPerkKey } from '../../../domain/team-progression/team-progression-rules'
import type { TeamWeeklyRow } from '../../infra/orm/repositories/team-progression.repository.interface'

/**
 * Les quatre sources de points d'équipe. L'appelant passe une QUANTITÉ
 * BRUTE (des dégâts, un nombre de tirages, `1` pour un duel ou un pari) et
 * sa source : la pondération est lue en config et appliquée dans `award`,
 * jamais chez l'appelant, sinon quatre barèmes divergent.
 */
export type TeamPointSource = 'RAID_DAMAGE' | 'DUEL_WON' | 'BET_WON' | 'PULL'

/** L'effet APPLIQUÉ de chaque bonus, jamais le rang brut. */
export type TeamPerkEffects = Record<TeamPerkKey, number>

/** Ce qu'un crédit a fait à une équipe, une fois la transaction commitée. */
export type TeamAwardResult = {
  teamId: string
  /** Points effectivement crédités, après pondération. */
  points: number
  /** Nouveau total hebdomadaire du membre dans cette équipe. */
  memberWeekPoints: number
  level: number
  xp: number
  perkPoints: number
  perkPointsGained: number
}

export type TeamPerkState = {
  key: TeamPerkKey
  rank: number
  /** Effet à ce rang, passé par `perkEffect` — le front n'en refait pas le calcul. */
  effect: number
  unlockLevel: number
  unlocked: boolean
}

/** Vue de l'arbre de bonus d'une équipe après une dépense ou une remise à zéro. */
export type TeamPerksView = {
  teamId: string
  level: number
  xp: number
  /** XP restant à faire pour le niveau suivant. `0` au niveau maximum. */
  xpToNext: number
  perkPoints: number
  maxRank: number
  perks: TeamPerkState[]
}

export interface ITeamProgressionDomain {
  /**
   * Crédite des points d'équipe. `teamId` est fourni pour un raid (l'équipe
   * dont le raid est attaqué), un duel ou un pari (l'équipe de l'enjeu) ;
   * `null` pour un tirage, et alors TOUTES les équipes du joueur sont
   * créditées du montant plein — l'XP d'équipe n'est pas un pot partagé.
   *
   * Une équipe NOMMÉE par l'appelant voit l'appartenance du joueur vérifiée
   * dans la transaction : un non-membre est refusé
   * (`Boom.forbidden`), jamais crédité en silence. Une équipe dissoute
   * entre-temps est simplement absente du résultat, sans erreur.
   */
  award(
    userId: string,
    teamId: string | null,
    source: TeamPointSource,
    amount: number,
    now?: Date,
  ): Promise<TeamAwardResult[]>
  /**
   * L'arbre de bonus en lecture. Les QUATRE bonus sont toujours présents,
   * même au rang 0 et avant leur niveau de déblocage.
   */
  getPerksView(teamId: string): Promise<TeamPerksView>
  /** Points hebdomadaires de la semaine en cours : total et détail par membre. */
  getWeeklyPoints(
    teamId: string,
    now?: Date,
  ): Promise<{ weekKey: string; total: number; members: TeamWeeklyRow[] }>
  /** Investit un point dans un bonus. Chef et officiers uniquement. */
  spendPerkPoint(
    teamId: string,
    userId: string,
    key: TeamPerkKey,
  ): Promise<TeamPerksView>
  /** Remet tous les rangs à 0 et rend exactement les points dépensés. Chef seul, gratuit, illimité. */
  resetPerks(teamId: string, userId: string): Promise<TeamPerksView>
  /**
   * L'effet appliqué de chaque bonus pour ce joueur, au MEILLEUR rang parmi
   * ses équipes. Une seule requête Postgres : à résoudre UNE fois par
   * requête HTTP et à passer en paramètre, jamais par élément d'une liste.
   *
   * Vaut pour `loot`, `xp` et `forge` — ce qu'UN JOUEUR gagne. Le champ
   * `raid` renvoyé ici n'est PAS la bonne lecture pour créditer un quota
   * d'attaques : voir `raidAttacksBonusForTeam`.
   */
  effectsForUser(userId: string): Promise<TeamPerkEffects>
  /**
   * L'effet du bonus `raid`, scopé à l'équipe dont le boss est attaqué —
   * jamais au meilleur rang parmi les équipes du joueur. `raid` change ce
   * qu'UNE ÉQUIPE affronte (des PV calibrés par membre pour cette équipe),
   * contrairement aux trois autres bonus qui changent ce qu'un joueur
   * gagne. Une seule requête Postgres, même motif que `effectsForUser`.
   */
  raidAttacksBonusForTeam(teamId: string): Promise<number>
}
