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
    nameEn: 'Aurore the Peasant',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 151,
    baseAtk: 18,
    baseDef: 18,
    baseSpd: 95,
    element: 'EARTH',
    passiveKey: null,
  }, // Soutien
  {
    id: 'HUM-002',
    nameFr: 'Roland le Garde',
    nameEn: 'Roland the Guard',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 185,
    baseAtk: 15,
    baseDef: 38,
    baseSpd: 81,
    element: 'DARK',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-003',
    nameFr: 'Mira la Voleuse',
    nameEn: 'Mira the Thief',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 85,
    baseAtk: 32,
    baseDef: 8,
    baseSpd: 123,
    element: 'WATER',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-004',
    nameFr: 'Frère Anselme',
    nameEn: 'Brother Anselme',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 77,
    baseAtk: 44,
    baseDef: 5,
    baseSpd: 94,
    element: 'LIGHT',
    passiveKey: null,
  }, // Mage
  {
    id: 'HUM-005',
    nameFr: 'Gauthier le Forgeron',
    nameEn: 'Gauthier the Blacksmith',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 195,
    baseAtk: 15,
    baseDef: 38,
    baseSpd: 81,
    element: 'EARTH',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-006',
    nameFr: "Léna l'Archère",
    nameEn: 'Lena the Archer',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 82,
    baseAtk: 34,
    baseDef: 8,
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
    baseHp: 195,
    baseAtk: 17,
    baseDef: 38,
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
    baseHp: 127,
    baseAtk: 24,
    baseDef: 14,
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
    baseHp: 197,
    baseAtk: 15,
    baseDef: 34,
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
    baseAtk: 38,
    baseDef: 8,
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
    baseAtk: 34,
    baseDef: 8,
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
    baseHp: 191,
    baseAtk: 15,
    baseDef: 38,
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
    baseHp: 120,
    baseAtk: 25,
    baseDef: 14,
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
    baseHp: 127,
    baseAtk: 25,
    baseDef: 14,
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
    baseHp: 115,
    baseAtk: 20,
    baseDef: 14,
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
    baseAtk: 32,
    baseDef: 8,
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
    baseHp: 195,
    baseAtk: 15,
    baseDef: 34,
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
    baseHp: 124,
    baseAtk: 24,
    baseDef: 14,
    baseSpd: 91,
    element: 'DARK',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-019',
    nameFr: 'Lyra la Vive',
    nameEn: 'Lyra the Lively',
    rarity: 'COMMON',
    dropWeight: 85,
    baseHp: 127,
    baseAtk: 24,
    baseDef: 14,
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
    baseHp: 257,
    baseAtk: 23,
    baseDef: 44,
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
    baseAtk: 49,
    baseDef: 9,
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
    baseAtk: 49,
    baseDef: 9,
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
    baseHp: 267,
    baseAtk: 21,
    baseDef: 44,
    baseSpd: 81,
    element: 'NATURE',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-024',
    nameFr: 'Mélisande',
    nameEn: 'Melisande',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 162,
    baseAtk: 35,
    baseDef: 17,
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
    baseHp: 157,
    baseAtk: 32,
    baseDef: 17,
    baseSpd: 100,
    element: 'EARTH',
    passiveKey: null,
  }, // Équilibré
  {
    id: 'HUM-026',
    nameFr: 'Kenji le Ronin',
    nameEn: 'Kenji the Ronin',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 106,
    baseAtk: 42,
    baseDef: 9,
    baseSpd: 119,
    element: 'EARTH',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-027',
    nameFr: 'Dame Coralie',
    nameEn: 'Lady Coralie',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 194,
    baseAtk: 35,
    baseDef: 23,
    baseSpd: 88,
    element: 'WATER',
    passiveKey: null,
  }, // Combattant
  {
    id: 'HUM-028',
    nameFr: 'Séléné au Fouet',
    nameEn: 'Selene of the Whip',
    rarity: 'UNCOMMON',
    dropWeight: 38,
    baseHp: 119,
    baseAtk: 45,
    baseDef: 9,
    baseSpd: 115,
    element: 'WATER',
    passiveKey: null,
  }, // Assassin
  // RARE — dropWeight 16 chacune
  {
    id: 'HUM-029',
    nameFr: 'Capitaine Hélène',
    nameEn: 'Captain Helene',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 374,
    baseAtk: 30,
    baseDef: 55,
    baseSpd: 88,
    element: 'EARTH',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-030',
    nameFr: 'Dame Ysolde la Paladine',
    nameEn: 'Lady Ysolde the Paladin',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 375,
    baseAtk: 30,
    baseDef: 59,
    baseSpd: 80,
    element: 'DARK',
    passiveKey: null,
  }, // Tank
  {
    id: 'HUM-031',
    nameFr: 'Séraphine la Magicienne',
    nameEn: 'Seraphine the Sorceress',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 151,
    baseAtk: 77,
    baseDef: 9,
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
    baseHp: 230,
    baseAtk: 46,
    baseDef: 22,
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
    baseAtk: 62,
    baseDef: 11,
    baseSpd: 135,
    element: 'NATURE',
    passiveKey: null,
  }, // Assassin
  {
    id: 'HUM-034',
    nameFr: 'Akira Double-Lame',
    nameEn: 'Akira Double-Blade',
    rarity: 'RARE',
    dropWeight: 16,
    baseHp: 164,
    baseAtk: 62,
    baseDef: 12,
    baseSpd: 131,
    element: 'FIRE',
    passiveKey: null,
  }, // Assassin
  // EPIC — dropWeight 4 chacune
  {
    id: 'HUM-035',
    nameFr: 'Archimage Cael',
    nameEn: 'Archmage Cael',
    rarity: 'EPIC',
    dropWeight: 4,
    baseHp: 241,
    baseAtk: 125,
    baseDef: 13,
    baseSpd: 96,
    element: 'FIRE',
    passiveKey: 'HAMPER',
  }, // Mage
  {
    id: 'HUM-036',
    nameFr: 'Garnier',
    nameEn: 'Garnier',
    rarity: 'EPIC',
    dropWeight: 4,
    baseHp: 612,
    baseAtk: 47,
    baseDef: 76,
    baseSpd: 88,
    element: 'NATURE',
    passiveKey: 'AEGIS',
  }, // Tank
  // LEGENDARY — dropWeight 1 chacune
  {
    id: 'HUM-037',
    nameFr: 'Roi Aldric',
    nameEn: 'King Aldric',
    rarity: 'LEGENDARY',
    dropWeight: 1,
    baseHp: 776,
    baseAtk: 115,
    baseDef: 60,
    baseSpd: 106,
    element: 'LIGHT',
    passiveKey: 'STUN',
  }, // Combattant
  {
    id: 'HUM-038',
    nameFr: 'Reine Isaure',
    nameEn: 'Queen Isaure',
    rarity: 'LEGENDARY',
    dropWeight: 1,
    baseHp: 759,
    baseAtk: 122,
    baseDef: 54,
    baseSpd: 107,
    element: 'WATER',
    passiveKey: 'BANNER',
  }, // Combattant
] as const

/**
 * Le set qui contient les 38 cartes ci-dessus.
 */
export const HUMAN_CARD_SET = {
  nameFr: 'Humains',
  nameEn: 'Humans',
  descriptionFr:
    'Le set des Humains du Gachapon. 38 combattants à collectionner, de la paysanne au roi.',
  descriptionEn:
    'The Gachapon Humans set. 38 collectible fighters, from peasant to king.',
}
