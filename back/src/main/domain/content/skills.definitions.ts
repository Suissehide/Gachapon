/**
 * Textes de l'arbre de compétences — 4 branches et 27 nœuds.
 *
 * Vit sous `src/main/` et non dans `prisma/seed/` parce que du code de
 * PRODUCTION le consomme : le backfill de traductions au démarrage doit lire
 * ces libellés, et `npm run build` ne transpile que `src/main/`.
 *
 * Seuls les TEXTES sont ici : la topologie de l'arbre (positions, paliers,
 * effets, arêtes) reste dans `prisma/seed/skills.ts`, parce qu'elle se
 * construit par créations successives dont les identifiants servent aux
 * arêtes — elle n'a pas de forme tabulaire à partager.
 *
 * Les clés sont les noms des variables du seed : `SkillBranch` et
 * `SkillNode` n'ont pas de colonne `key` en base, et c'est `nameFr` qui sert
 * de clé de rapprochement au backfill.
 */

export interface SkillTextDefinition {
  nameFr: string
  nameEn: string
  descriptionFr: string
  descriptionEn: string
}

export const SKILL_BRANCH_TEXT = {
  flux: {
    nameFr: 'Flux',
    nameEn: 'Flux',
    descriptionFr: 'Tickets & Énergie',
    descriptionEn: 'Tickets & Énergie',
  },
  fortune: {
    nameFr: 'Fortune',
    nameEn: 'Fortune',
    descriptionFr: 'Gacha & Chance',
    descriptionEn: 'Gacha & Chance',
  },
  collection: {
    nameFr: 'Collection',
    nameEn: 'Collection',
    descriptionFr: 'Dust & Boutique',
    descriptionEn: 'Dust & Boutique',
  },
  combat: {
    nameFr: 'Combat',
    nameEn: 'Combat',
    descriptionFr: 'Énergie & Butin',
    descriptionEn: 'Énergie & Butin',
  },
} as const satisfies Record<string, SkillTextDefinition>

export const SKILL_NODE_TEXT = {
  regen: {
    nameFr: 'Régénération',
    nameEn: 'Régénération',
    descriptionFr: 'Réduit le délai de régénération des jetons',
    descriptionEn: 'Réduit le délai de régénération des jetons',
  },
  stockage: {
    nameFr: 'Stockage',
    nameEn: 'Stockage',
    descriptionFr: 'Augmente le stockage max de jetons',
    descriptionEn: 'Augmente le stockage max de jetons',
  },
  multiToken: {
    nameFr: 'Multi-jetons',
    nameEn: 'Multi-jetons',
    descriptionFr: 'Chance de recevoir plusieurs jetons à la fois',
    descriptionEn: 'Chance de recevoir plusieurs jetons à la fois',
  },
  tirageGratuitFlux: {
    nameFr: 'Tirage gratuit',
    nameEn: 'Tirage gratuit',
    descriptionFr: 'Chance de tirer sans consommer de jeton',
    descriptionEn: 'Chance de tirer sans consommer de jeton',
  },
  tropPlein: {
    nameFr: 'Trop-plein',
    nameEn: 'Trop-plein',
    descriptionFr:
      'Les jetons régénérés au-delà du plafond reviennent en poussière',
    descriptionEn:
      'Les jetons régénérés au-delà du plafond reviennent en poussière',
  },
  ferveur: {
    nameFr: 'Ferveur',
    nameEn: 'Ferveur',
    descriptionFr: "Bonus d'XP par tirage",
    descriptionEn: "Bonus d'XP par tirage",
  },
  luck: {
    nameFr: 'Chance',
    nameEn: 'Chance',
    descriptionFr:
      "Multiplie les chances de tirer une carte Rare ou mieux (jusqu'à ×1,12)",
    descriptionEn:
      "Multiplie les chances de tirer une carte Rare ou mieux (jusqu'à ×1,12)",
  },
  bouleDor: {
    nameFr: "Boule d'or",
    nameEn: "Boule d'or",
    descriptionFr: "Chance d'obtenir une boule en or",
    descriptionEn: "Chance d'obtenir une boule en or",
  },
  voeuExauce: {
    nameFr: 'Vœu exaucé',
    nameEn: 'Vœu exaucé',
    descriptionFr:
      "Chance qu'un tirage donne une carte souhaitée de même rareté",
    descriptionEn:
      "Chance qu'un tirage donne une carte souhaitée de même rareté",
  },
  opulence: {
    nameFr: 'Opulence',
    nameEn: 'Opulence',
    descriptionFr:
      "Relève la limite journalière d'achat de packs d'énergie (3 → 6)",
    descriptionEn:
      "Relève la limite journalière d'achat de packs d'énergie (3 → 6)",
  },
  destin: {
    nameFr: 'Destin',
    nameEn: 'Destin',
    descriptionFr: 'Abaisse le seuil de pitié',
    descriptionEn: 'Abaisse le seuil de pitié',
  },
  prisme: {
    nameFr: 'Prisme',
    nameEn: 'Prisme',
    descriptionFr: 'Augmente les chances de variantes Brillant/Holo',
    descriptionEn: 'Augmente les chances de variantes Brillant/Holo',
  },
  recyclage: {
    nameFr: 'Recyclage',
    nameEn: 'Recyclage',
    descriptionFr: 'Plus de poussière lors du recyclage de doublons',
    descriptionEn: 'Plus de poussière lors du recyclage de doublons',
  },
  reduction: {
    nameFr: 'Réduction',
    nameEn: 'Réduction',
    descriptionFr: 'Réduit les prix en poussière de la boutique',
    descriptionEn: 'Réduit les prix en poussière de la boutique',
  },
  artisan: {
    nameFr: 'Artisan',
    nameEn: 'Artisan',
    descriptionFr: "Réduit le coût en poussière d'amélioration des cartes",
    descriptionEn: "Réduit le coût en poussière d'amélioration des cartes",
  },
  marchandeur: {
    nameFr: 'Marchandeur',
    nameEn: 'Marchandeur',
    descriptionFr: 'Réduit les prix en or de la boutique',
    descriptionEn: 'Réduit les prix en or de la boutique',
  },
  apexCollection: {
    nameFr: 'Apogée de Collection',
    nameEn: 'Apogée de Collection',
    descriptionFr: 'Plus de cartes rares dans ta boutique du jour',
    descriptionEn: 'Plus de cartes rares dans ta boutique du jour',
  },
  collectionneur: {
    nameFr: 'Collectionneur',
    nameEn: 'Collectionneur',
    descriptionFr: 'Emplacements de vœu supplémentaires (2 de base)',
    descriptionEn: 'Emplacements de vœu supplémentaires (2 de base)',
  },
  etalElargi: {
    nameFr: 'Étal élargi',
    nameEn: 'Étal élargi',
    descriptionFr: 'Cartes supplémentaires à la boutique du jour',
    descriptionEn: 'Cartes supplémentaires à la boutique du jour',
  },
  endurance: {
    nameFr: 'Endurance',
    nameEn: 'Endurance',
    descriptionFr: "Augmente le stock maximum d'énergie",
    descriptionEn: "Augmente le stock maximum d'énergie",
  },
  recuperation: {
    nameFr: 'Récupération',
    nameEn: 'Récupération',
    descriptionFr: "Réduit le délai de régénération de l'énergie",
    descriptionEn: "Réduit le délai de régénération de l'énergie",
  },
  butinDore: {
    nameFr: 'Butin doré',
    nameEn: 'Butin doré',
    descriptionFr: 'Bonus de gold sur les victoires',
    descriptionEn: 'Bonus de gold sur les victoires',
  },
  logistique: {
    nameFr: 'Logistique',
    nameEn: 'Logistique',
    descriptionFr: 'Réduit le coût du farm',
    descriptionEn: 'Réduit le coût du farm',
  },
  veteran: {
    nameFr: 'Vétéran',
    nameEn: 'Vétéran',
    descriptionFr: "Bonus d'XP combat",
    descriptionEn: "Bonus d'XP combat",
  },
  apexCombat: {
    nameFr: 'Apogée de Combat',
    nameEn: 'Apogée de Combat',
    descriptionFr: "Bonus de chance d'équipement en combat",
    descriptionEn: "Bonus de chance d'équipement en combat",
  },
  forgeron: {
    nameFr: 'Forgeron',
    nameEn: 'Forgeron',
    descriptionFr: "Réduit le coût en or d'amélioration des équipements",
    descriptionEn: "Réduit le coût en or d'amélioration des équipements",
  },
  ferrailleur: {
    nameFr: 'Ferrailleur',
    nameEn: 'Ferrailleur',
    descriptionFr: "Plus d'or au recyclage des équipements",
    descriptionEn: "Plus d'or au recyclage des équipements",
  },
} as const satisfies Record<string, SkillTextDefinition>
