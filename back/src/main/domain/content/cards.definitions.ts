/**
 * Définitions du set « Humains » — 38 cartes et leurs stats de base.
 *
 * Vit sous `src/main/` et non dans `prisma/seed/` parce que du code de
 * PRODUCTION la consomme : le backfill de traductions au démarrage doit lire
 * ces noms, et `npm run build` ne transpile que `src/main/`.
 * `prisma/seed/cards.ts` n'y garde que l'écriture en base.
 */

/**
 * Préfixe de stockage des images de cartes selon l'environnement.
 * - Prod  : `cards/humans/…`          (bucket gachapon → gachapon/cards/humans)
 * - Dev   : `staging/cards/humans/…`  (bucket gachapon → gachapon/staging/cards/humans)
 */
export const IMAGE_PREFIX =
  process.env.NODE_ENV === 'production'
    ? 'cards/humans'
    : 'staging/cards/humans'

/**
 * Set « Humains ». Stats de base (baseHp/Atk/Def/Spd) pré-calculées par carte :
 * dérivées du barème par rareté puis variées par archétype (Tank plus résistant,
 * Assassin/Tireur plus rapide et offensif, Mage glass-cannon, etc.).
 * Source de vérité partagée avec le tcg_kit (onglet Production, colonnes PV/ATQ/DEF/VIT).
 */
export const CARDS = [
  // COMMON — dropWeight 85 chacune
  {
    id: 'HUM-001',
    nameFr: 'Aurore la Paysanne',
    nameEn: 'Aurore la Paysanne',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 116,
    baseAtk: 17,
    baseDef: 5,
    baseSpd: 95,
    element: 'EARTH',
    passiveKey: null,
  }, // Soutien
  {
    id: 'HUM-002',
    nameFr: 'Roland le Garde',
    nameEn: 'Roland le Garde',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 123,
    baseAtk: 15,
    baseDef: 8,
    baseSpd: 81,
    element: 'DARK',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-003',
    nameFr: 'Mira la Voleuse',
    nameEn: 'Mira la Voleuse',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 85,
    baseAtk: 23,
    baseDef: 4,
    baseSpd: 123,
    element: 'WATER',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-004',
    nameFr: 'Frère Anselme',
    nameEn: 'Frère Anselme',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 81,
    baseAtk: 29,
    baseDef: 3,
    baseSpd: 94,
    element: 'LIGHT',
    passiveKey: null,
  }, // Mage
  {
    id: 'HUM-005',
    nameFr: 'Gauthier le Forgeron',
    nameEn: 'Gauthier le Forgeron',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 130,
    baseAtk: 15,
    baseDef: 8,
    baseSpd: 81,
    element: 'EARTH',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-006',
    nameFr: "Léna l'Archère",
    nameEn: "Léna l'Archère",
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 82,
    baseAtk: 24,
    baseDef: 4,
    baseSpd: 100,
    element: 'WATER',
    passiveKey: null,
  }, // Tireur
  {
    id: 'HUM-007',
    nameFr: 'Aldric',
    nameEn: 'Aldric',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 130,
    baseAtk: 17,
    baseDef: 8,
    baseSpd: 75,
    element: 'LIGHT',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-008',
    nameFr: 'Aveline',
    nameEn: 'Aveline',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 106,
    baseAtk: 20,
    baseDef: 5,
    baseSpd: 85,
    element: 'WATER',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-009',
    nameFr: 'Gauvain',
    nameEn: 'Gauvain',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 131,
    baseAtk: 15,
    baseDef: 7,
    baseSpd: 82,
    element: 'DARK',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-010',
    nameFr: 'Tristan',
    nameEn: 'Tristan',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 87,
    baseAtk: 27,
    baseDef: 4,
    baseSpd: 97,
    element: 'LIGHT',
    passiveKey: null,
  }, // Tireur
  {
    id: 'HUM-011',
    nameFr: 'Mahaut',
    nameEn: 'Mahaut',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 88,
    baseAtk: 24,
    baseDef: 4,
    baseSpd: 102,
    element: 'FIRE',
    passiveKey: null,
  }, // Tireur
  {
    id: 'HUM-012',
    nameFr: 'Lucien',
    nameEn: 'Lucien',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 127,
    baseAtk: 15,
    baseDef: 8,
    baseSpd: 72,
    element: 'NATURE',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-013',
    nameFr: 'Alix',
    nameEn: 'Alix',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 100,
    baseAtk: 21,
    baseDef: 5,
    baseSpd: 95,
    element: 'FIRE',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-014',
    nameFr: 'Thibault',
    nameEn: 'Thibault',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 106,
    baseAtk: 21,
    baseDef: 5,
    baseSpd: 92,
    element: 'DARK',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-015',
    nameFr: 'Enguerrand',
    nameEn: 'Enguerrand',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 96,
    baseAtk: 17,
    baseDef: 5,
    baseSpd: 95,
    element: 'LIGHT',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-016',
    nameFr: 'Yseult',
    nameEn: 'Yseult',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 78,
    baseAtk: 23,
    baseDef: 4,
    baseSpd: 110,
    element: 'NATURE',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-017',
    nameFr: 'Constant',
    nameEn: 'Constant',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 130,
    baseAtk: 15,
    baseDef: 7,
    baseSpd: 76,
    element: 'LIGHT',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-018',
    nameFr: 'Blanche',
    nameEn: 'Blanche',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 103,
    baseAtk: 20,
    baseDef: 5,
    baseSpd: 91,
    element: 'DARK',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-019',
    nameFr: 'Lyra la Vive',
    nameEn: 'Lyra la Vive',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 106,
    baseAtk: 20,
    baseDef: 5,
    baseSpd: 94,
    element: 'FIRE',
    passiveKey: null,
  }, // Équilibré
  // UNCOMMON — dropWeight 38 chacune
  {
    id: 'HUM-020',
    nameFr: 'Baudouin',
    nameEn: 'Baudouin',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 171,
    baseAtk: 23,
    baseDef: 10,
    baseSpd: 81,
    element: 'EARTH',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-021',
    nameFr: 'Aymeric',
    nameEn: 'Aymeric',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 118,
    baseAtk: 35,
    baseDef: 5,
    baseSpd: 105,
    element: 'DARK',
    passiveKey: null,
  }, // Tireur
  {
    id: 'HUM-022',
    nameFr: 'Eleonore',
    nameEn: 'Eleonore',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 122,
    baseAtk: 35,
    baseDef: 5,
    baseSpd: 98,
    element: 'DARK',
    passiveKey: null,
  }, // Tireur
  {
    id: 'HUM-023',
    nameFr: 'Foulques',
    nameEn: 'Foulques',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 178,
    baseAtk: 21,
    baseDef: 10,
    baseSpd: 81,
    element: 'NATURE',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-024',
    nameFr: 'Mélisande',
    nameEn: 'Mélisande',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 135,
    baseAtk: 29,
    baseDef: 7,
    baseSpd: 100,
    element: 'NATURE',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-025',
    nameFr: 'Perceval',
    nameEn: 'Perceval',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 131,
    baseAtk: 27,
    baseDef: 7,
    baseSpd: 100,
    element: 'EARTH',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-026',
    nameFr: 'Kenji le Ronin',
    nameEn: 'Kenji le Ronin',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 106,
    baseAtk: 30,
    baseDef: 5,
    baseSpd: 119,
    element: 'EARTH',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-027',
    nameFr: 'Dame Coralie',
    nameEn: 'Dame Coralie',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 149,
    baseAtk: 29,
    baseDef: 8,
    baseSpd: 88,
    element: 'WATER',
    passiveKey: null,
  }, // Combattant
  {
    id: 'HUM-028',
    nameFr: 'Séléné au Fouet',
    nameEn: 'Séléné au Fouet',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 119,
    baseAtk: 32,
    baseDef: 5,
    baseSpd: 115,
    element: 'WATER',
    passiveKey: null,
  }, // Assassin
  // RARE — dropWeight 16 chacune
  {
    id: 'HUM-029',
    nameFr: 'Capitaine Hélène',
    nameEn: 'Capitaine Hélène',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 249,
    baseAtk: 30,
    baseDef: 14,
    baseSpd: 88,
    element: 'EARTH',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-030',
    nameFr: 'Dame Ysolde la Paladine',
    nameEn: 'Dame Ysolde la Paladine',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 250,
    baseAtk: 30,
    baseDef: 15,
    baseSpd: 80,
    element: 'DARK',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-031',
    nameFr: 'Séraphine la Magicienne',
    nameEn: 'Séraphine la Magicienne',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 159,
    baseAtk: 51,
    baseDef: 7,
    baseSpd: 96,
    element: 'DARK',
    passiveKey: null,
  }, // Mage
  {
    id: 'HUM-032',
    nameFr: 'Josselin',
    nameEn: 'Josselin',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 192,
    baseAtk: 38,
    baseDef: 10,
    baseSpd: 93,
    element: 'FIRE',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-033',
    nameFr: 'Oriane',
    nameEn: 'Oriane',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 155,
    baseAtk: 44,
    baseDef: 7,
    baseSpd: 135,
    element: 'NATURE',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-034',
    nameFr: 'Akira Double-Lame',
    nameEn: 'Akira Double-Lame',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 164,
    baseAtk: 44,
    baseDef: 8,
    baseSpd: 131,
    element: 'FIRE',
    passiveKey: null,
  }, // Assassin
  // EPIC — dropWeight 8 chacune
  {
    id: 'HUM-035',
    nameFr: 'Archimage Cael',
    nameEn: 'Archimage Cael',
    rarity: 'EPIC',
    dropWeight: 8,
    baseHp: 254,
    baseAtk: 83,
    baseDef: 11,
    baseSpd: 96,
    element: 'FIRE',
    passiveKey: 'PIERCE',
  }, // Mage
  {
    id: 'HUM-036',
    nameFr: 'Garnier',
    nameEn: 'Garnier',
    rarity: 'EPIC',
    dropWeight: 8,
    baseHp: 408,
    baseAtk: 47,
    baseDef: 22,
    baseSpd: 88,
    element: 'NATURE',
    passiveKey: 'AEGIS',
  }, // Tank
  // LEGENDARY — dropWeight 2 chacune
  {
    id: 'HUM-037',
    nameFr: 'Roi Aldric',
    nameEn: 'Roi Aldric',
    rarity: 'LEGENDARY',
    dropWeight: 2,
    baseHp: 597,
    baseAtk: 96,
    baseDef: 30,
    baseSpd: 106,
    element: 'LIGHT',
    passiveKey: 'NEMESIS',
  }, // Combattant
  {
    id: 'HUM-038',
    nameFr: 'Reine Isaure',
    nameEn: 'Reine Isaure',
    rarity: 'LEGENDARY',
    dropWeight: 2,
    baseHp: 584,
    baseAtk: 102,
    baseDef: 27,
    baseSpd: 107,
    element: 'WATER',
    passiveKey: 'BANNER',
  }, // Combattant
] as const

/**
 * Le set qui contient les 38 cartes ci-dessus.
 */
export const HUMAN_CARD_SET = {
  // nameEn/descriptionEn recopient provisoirement le français : la tâche 8
  // y mettra la vraie traduction.
  nameFr: 'Royaume des Humains',
  nameEn: 'Royaume des Humains',
  descriptionFr:
    'Le set des Humains du Gachapon. 38 combattants à collectionner, de la paysanne au roi.',
  descriptionEn:
    'Le set des Humains du Gachapon. 38 combattants à collectionner, de la paysanne au roi.',
}
