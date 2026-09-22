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
    descriptionEn: 'Tokens & Energy',
  },
  fortune: {
    nameFr: 'Fortune',
    nameEn: 'Fortune',
    descriptionFr: 'Gacha & Chance',
    descriptionEn: 'Gacha & Luck',
  },
  collection: {
    nameFr: 'Collection',
    nameEn: 'Collection',
    descriptionFr: 'Dust & Boutique',
    descriptionEn: 'Dust & Shop',
  },
  combat: {
    nameFr: 'Combat',
    nameEn: 'Combat',
    descriptionFr: 'Énergie & Butin',
    descriptionEn: 'Energy & Loot',
  },
} as const satisfies Record<string, SkillTextDefinition>

export const SKILL_NODE_TEXT = {
  regen: {
    nameFr: 'Régénération',
    nameEn: 'Regeneration',
    descriptionFr: 'Réduit le délai de régénération des jetons',
    descriptionEn: 'Reduces token regeneration time',
  },
  stockage: {
    nameFr: 'Stockage',
    nameEn: 'Storage',
    descriptionFr: 'Augmente le stockage max de jetons',
    descriptionEn: 'Increases max token storage',
  },
  multiToken: {
    nameFr: 'Multi-jetons',
    nameEn: 'Multi-Token',
    descriptionFr: 'Chance de recevoir plusieurs jetons à la fois',
    descriptionEn: 'Chance to receive several tokens at once',
  },
  tirageGratuitFlux: {
    nameFr: 'Tirage gratuit',
    nameEn: 'Free Pull',
    descriptionFr: 'Chance de tirer sans consommer de jeton',
    descriptionEn: 'Chance to pull without spending a token',
  },
  tropPlein: {
    nameFr: 'Trop-plein',
    nameEn: 'Overflow',
    descriptionFr:
      'Les jetons régénérés au-delà du plafond reviennent en poussière',
    descriptionEn: 'Tokens regenerated past the cap turn into dust',
  },
  ferveur: {
    nameFr: 'Ferveur',
    nameEn: 'Fervor',
    descriptionFr: "Bonus d'XP par tirage",
    descriptionEn: 'XP bonus per pull',
  },
  luck: {
    nameFr: 'Chance',
    nameEn: 'Luck',
    descriptionFr:
      "Multiplie les chances de tirer une carte Rare ou mieux (jusqu'à ×1,12)",
    descriptionEn:
      'Multiplies the odds of pulling a Rare card or better (up to ×1.12)',
  },
  bouleDor: {
    nameFr: "Boule d'or",
    nameEn: 'Golden Ball',
    descriptionFr: "Chance d'obtenir une boule en or",
    descriptionEn: 'Chance to get a golden ball',
  },
  voeuExauce: {
    nameFr: 'Vœu exaucé',
    nameEn: 'Wish Granted',
    descriptionFr:
      "Chance qu'un tirage donne une carte souhaitée de même rareté",
    descriptionEn: 'Chance for a pull to give a wished card of the same rarity',
  },
  opulence: {
    nameFr: 'Opulence',
    nameEn: 'Opulence',
    descriptionFr:
      "Relève la limite journalière d'achat de packs d'énergie (3 → 6)",
    descriptionEn: 'Raises the daily energy pack purchase limit (3 → 6)',
  },
  destin: {
    nameFr: 'Destin',
    nameEn: 'Fate',
    descriptionFr: 'Abaisse le seuil de pitié',
    descriptionEn: 'Lowers the pity threshold',
  },
  prisme: {
    nameFr: 'Prisme',
    nameEn: 'Prism',
    descriptionFr: 'Augmente les chances de variantes Brillant/Holo',
    descriptionEn: 'Increases the odds of Brilliant/Holo variants',
  },
  recyclage: {
    nameFr: 'Recyclage',
    nameEn: 'Recycling',
    descriptionFr: 'Plus de poussière lors du recyclage de doublons',
    descriptionEn: 'More dust when recycling duplicates',
  },
  reduction: {
    nameFr: 'Réduction',
    nameEn: 'Discount',
    descriptionFr: 'Réduit les prix en poussière de la boutique',
    descriptionEn: 'Reduces dust prices in the shop',
  },
  artisan: {
    nameFr: 'Artisan',
    nameEn: 'Artisan',
    descriptionFr: "Réduit le coût en poussière d'amélioration des cartes",
    descriptionEn: 'Reduces the dust cost of card upgrades',
  },
  marchandeur: {
    nameFr: 'Marchandeur',
    nameEn: 'Haggler',
    descriptionFr: 'Réduit les prix en or de la boutique',
    descriptionEn: 'Reduces gold prices in the shop',
  },
  apexCollection: {
    nameFr: 'Apogée de Collection',
    nameEn: 'Collection Apex',
    descriptionFr: 'Plus de cartes rares dans ta boutique du jour',
    descriptionEn: 'More rare cards in your daily shop',
  },
  collectionneur: {
    nameFr: 'Collectionneur',
    nameEn: 'Collector',
    descriptionFr: 'Emplacements de vœu supplémentaires (2 de base)',
    descriptionEn: 'Extra wish slots (2 by default)',
  },
  etalElargi: {
    nameFr: 'Étal élargi',
    nameEn: 'Expanded Stall',
    descriptionFr: 'Cartes supplémentaires à la boutique du jour',
    descriptionEn: 'Extra cards in the daily shop',
  },
  endurance: {
    nameFr: 'Endurance',
    nameEn: 'Endurance',
    descriptionFr: "Augmente le stock maximum d'énergie",
    descriptionEn: 'Increases max energy storage',
  },
  recuperation: {
    nameFr: 'Récupération',
    nameEn: 'Recovery',
    descriptionFr: "Réduit le délai de régénération de l'énergie",
    descriptionEn: 'Reduces energy regeneration time',
  },
  butinDore: {
    nameFr: 'Butin doré',
    nameEn: 'Golden Loot',
    descriptionFr: 'Bonus de gold sur les victoires',
    descriptionEn: 'Gold bonus on victories',
  },
  logistique: {
    nameFr: 'Logistique',
    nameEn: 'Logistics',
    descriptionFr: 'Réduit le coût du farm',
    descriptionEn: 'Reduces farming cost',
  },
  veteran: {
    nameFr: 'Vétéran',
    nameEn: 'Veteran',
    descriptionFr: "Bonus d'XP combat",
    descriptionEn: 'Battle XP bonus',
  },
  apexCombat: {
    nameFr: 'Apogée de Combat',
    nameEn: 'Combat Apex',
    descriptionFr: "Bonus de chance d'équipement en combat",
    descriptionEn: 'Bonus to equipment drop chance in battle',
  },
  forgeron: {
    nameFr: 'Forgeron',
    nameEn: 'Blacksmith',
    descriptionFr: "Réduit le coût en or d'amélioration des équipements",
    descriptionEn: 'Reduces the gold cost of equipment upgrades',
  },
  ferrailleur: {
    nameFr: 'Ferrailleur',
    nameEn: 'Scrapper',
    descriptionFr: "Plus d'or au recyclage des équipements",
    descriptionEn: 'More gold when salvaging equipment',
  },
} as const satisfies Record<string, SkillTextDefinition>
