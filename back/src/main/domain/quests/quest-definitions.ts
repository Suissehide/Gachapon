/**
 * Source unique des quêtes du jeu.
 *
 * Consommée par deux chemins :
 *  - `prisma/seed/quests.ts` — création sur base fraîche (dev, e2e) ;
 *  - `QuestsDomain.bootstrap()` — ajout create-only au démarrage, seul moyen
 *    de faire arriver une nouvelle quête sur une base vivante (le seed est
 *    destructif : il `deleteMany` toutes les tables avant d'écrire).
 *
 * Ajouter une quête = ajouter une entrée ici, rien d'autre. Le `criterion` est
 * typé `QuestCriterion`, si bien qu'une faute de frappe sur un `event` casse la
 * compilation au lieu de produire une quête qui ne progresse jamais.
 */

import type { QuestCriterion } from './quest-matching'

export interface QuestDefinition {
  key: string
  name: string
  description: string
  criterion: QuestCriterion
  period: 'ONESHOT' | 'WEEKLY'
  rewardTokens: number
  rewardDust: number
  rewardXp?: number
}

/**
 * Récompense d'une quête hebdomadaire — identique pour toutes. Le tirage étant
 * aléatoire, deux quêtes hebdo de valeurs différentes rendraient les semaines
 * inégales entre joueurs sans qu'aucun n'y puisse rien.
 */
const WEEKLY_REWARD = {
  rewardTokens: 5,
  rewardDust: 80,
  rewardXp: 150,
} as const

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  // -------------------------------------------------------------------------
  // One-shot — chaîne d'onboarding : enseigne une boucle de jeu à la fois.
  // Les jalons de progression (X tirages, posséder une rareté) sont couverts
  // par les succès (achievements) ; les quêtes ne les doublonnent plus.
  // -------------------------------------------------------------------------
  {
    key: 'first_pull',
    name: 'Premier Tirage',
    description: 'Effectue ton premier tirage au Gachapon.',
    criterion: { event: 'PULL_COMPLETED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 2,
    rewardDust: 0,
  },
  {
    key: 'first_battle',
    name: 'Baptême du Feu',
    description: 'Remporte ton premier combat en campagne.',
    criterion: { event: 'STAGE_CLEARED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 3,
    rewardDust: 25,
  },
  {
    key: 'first_card_level',
    name: 'Première Évolution',
    description: "Monte le niveau d'une carte pour la première fois.",
    criterion: { event: 'CARD_LEVELED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 3,
    rewardDust: 25,
  },
  {
    key: 'first_recycle',
    name: 'Premier Recyclage',
    description: 'Recycle ta première carte en poussière.',
    criterion: { event: 'CARD_RECYCLED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 2,
    rewardDust: 25,
  },
  {
    key: 'first_gold_spent',
    name: 'Premier Achat',
    description: "Dépense de l'or pour la première fois.",
    criterion: { event: 'GOLD_SPENT', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 2,
    rewardDust: 15,
  },
  {
    key: 'collect_10_unique',
    name: 'Collectionneur Débutant',
    description: 'Possède 10 cartes uniques dans ta collection.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 10,
      filter: { uniqueOnly: true },
    },
    period: 'ONESHOT',
    rewardTokens: 5,
    rewardDust: 100,
  },
  {
    key: 'join_team',
    name: 'Force du Groupe',
    description: 'Rejoins ou crée une équipe.',
    criterion: { event: 'TEAM_JOINED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 3,
    rewardDust: 25,
  },
  // Découverte de l'équipement — trois gestes, dans l'ordre où le joueur les
  // rencontre : il ramasse une pièce, il l'améliore, puis il apprend que le
  // surplus se recycle. Aucun filtre : un débutant ne choisit ni la rareté ni
  // le slot de son premier drop.
  {
    key: 'first_equipment',
    name: 'Premier Butin',
    description: 'Obtiens ta première pièce d’équipement en combat.',
    criterion: { event: 'EQUIPMENT_OBTAINED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 2,
    rewardDust: 25,
  },
  {
    key: 'first_equip_upgrade',
    name: 'Premier Affûtage',
    description: 'Améliore une pièce d’équipement pour la première fois.',
    criterion: { event: 'EQUIPMENT_UPGRADED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 3,
    rewardDust: 25,
  },
  {
    key: 'first_equip_salvage',
    name: 'Première Ferraille',
    description: 'Recycle ta première pièce d’équipement contre de l’or.',
    criterion: { event: 'EQUIPMENT_SALVAGED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 2,
    rewardDust: 25,
  },

  // -------------------------------------------------------------------------
  // Hebdomadaires — 3 tirées au sort chaque semaine parmi ce pool
  // (pickWeeklyQuests, déterministe sur le lundi UTC). La taille du pool est
  // le seul levier de variété : 11 quêtes = 165 combinaisons hebdo.
  // -------------------------------------------------------------------------
  {
    key: 'weekly_pulls_30',
    name: 'Semaine Explosive',
    description: 'Effectue 30 tirages cette semaine.',
    criterion: { event: 'PULL_COMPLETED', target: 30 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_uniques_5',
    name: 'Nouvelles Trouvailles',
    description: 'Obtiens 5 nouvelles cartes uniques cette semaine.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 5,
      filter: { uniqueOnly: true },
    },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_rares_3',
    name: 'Éclat Hebdomadaire',
    description: 'Obtiens 3 cartes RARE cette semaine.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 3,
      filter: { rarity: 'RARE' },
    },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_battles_15',
    name: 'Combattant Acharné',
    description: 'Remporte 15 combats cette semaine.',
    criterion: { event: 'STAGE_CLEARED', target: 15 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_recycle_15',
    name: 'Alchimiste',
    description: 'Recycle 15 exemplaires de cartes cette semaine.',
    criterion: { event: 'CARD_RECYCLED', target: 15 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_card_levels_8',
    name: "Maître d'Évolution",
    description: 'Monte le niveau de 8 cartes cette semaine.',
    criterion: { event: 'CARD_LEVELED', target: 8 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_gold_spent_4000',
    name: 'Dépensier',
    description: 'Dépense 4 000 or cette semaine.',
    criterion: { event: 'GOLD_SPENT', target: 4000 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  // Équipement — calibrées sur les volumes réels : la tour droppe une pièce à
  // chaque victoire en ferme (equipmentDropChance: 1) et la ferme campagne
  // entre 15 % et 20 %. 12 pièces se tiennent donc au même niveau d'effort que
  // les 15 combats de « Combattant Acharné ».
  {
    key: 'weekly_equip_drops_12',
    name: 'Chasseur de Trésors',
    description: 'Obtiens 12 pièces d’équipement cette semaine.',
    criterion: { event: 'EQUIPMENT_OBTAINED', target: 12 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  // RARE et non EPIC : le poids EPIC est nul aux étages 1-3 de la tour et
  // plafonne à 11 % à l'étage 7, une quête EPIC serait infaisable pour un
  // débutant et lui coûterait son bonus « semaine parfaite ». À ~25 % de RARE
  // sur 12 drops, la cible de 3 est atteignable sans farm supplémentaire.
  {
    key: 'weekly_equip_rare_3',
    name: 'Butin de Qualité',
    description: 'Obtiens 3 pièces d’équipement RARE cette semaine.',
    criterion: {
      event: 'EQUIPMENT_OBTAINED',
      target: 3,
      filter: { rarity: 'RARE' },
    },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  // 12 niveaux ≈ 1 500 or répartis sur des pièces fraîches (les niveaux 1-5
  // d'une RARE coûtent ~425 or au total), soit le même ordre de grandeur que
  // les 4 000 or de « Dépensier ».
  {
    key: 'weekly_equip_levels_12',
    name: 'Forgeron',
    description: 'Gagne 12 niveaux d’équipement cette semaine.',
    criterion: { event: 'EQUIPMENT_UPGRADED', target: 12 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
  {
    key: 'weekly_equip_salvage_15',
    name: 'Ferrailleur',
    description: 'Recycle 15 pièces d’équipement cette semaine.',
    criterion: { event: 'EQUIPMENT_SALVAGED', target: 15 },
    period: 'WEEKLY',
    ...WEEKLY_REWARD,
  },
]
