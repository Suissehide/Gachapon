import type { Prisma, PrismaClient } from '../../src/generated/client'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

interface SeedEntry {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  sortOrder: number
  criterion: Prisma.InputJsonValue
  reward: { tokens: number; dust: number; xp: number; cardRarity?: string }
}

const ENTRIES: SeedEntry[] = [
  // pulls
  {
    key: 'pulls_10',
    name: 'Mise en jambes',
    description: 'Réaliser 10 tirages.',
    family: 'pulls',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'PULL_COUNT', threshold: 10 },
    reward: { tokens: 5, dust: 0, xp: 0 },
  },
  {
    key: 'pulls_100',
    name: 'Habitué·e',
    description: 'Réaliser 100 tirages.',
    family: 'pulls',
    tier: 1,
    hidden: false,
    sortOrder: 2,
    criterion: { type: 'PULL_COUNT', threshold: 100 },
    reward: { tokens: 20, dust: 50, xp: 0 },
  },
  {
    key: 'pulls_500',
    name: 'Accro aux tirages',
    description: 'Réaliser 500 tirages.',
    family: 'pulls',
    tier: 2,
    hidden: false,
    sortOrder: 3,
    criterion: { type: 'PULL_COUNT', threshold: 500 },
    reward: { tokens: 50, dust: 200, xp: 100 },
  },
  {
    key: 'pulls_1000',
    name: 'Légende du gachapon',
    description: 'Réaliser 1 000 tirages.',
    family: 'pulls',
    tier: 3,
    hidden: false,
    sortOrder: 4,
    criterion: { type: 'PULL_COUNT', threshold: 1000 },
    reward: { tokens: 100, dust: 500, xp: 0, cardRarity: 'EPIC' },
  },

  // dust
  {
    key: 'dust_spent_500',
    name: 'Premier investissement',
    description: 'Dépenser 500 de poussière.',
    family: 'dust',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'DUST_SPENT', threshold: 500 },
    reward: { tokens: 10, dust: 0, xp: 0 },
  },
  {
    key: 'dust_spent_5000',
    name: 'Grand dépensier',
    description: 'Dépenser 5 000 de poussière.',
    family: 'dust',
    tier: 1,
    hidden: false,
    sortOrder: 2,
    criterion: { type: 'DUST_SPENT', threshold: 5000 },
    reward: { tokens: 30, dust: 100, xp: 0 },
  },
  {
    key: 'cards_recycled_50',
    name: 'Recycleur',
    description: 'Recycler 50 cartes.',
    family: 'dust',
    tier: 2,
    hidden: false,
    sortOrder: 3,
    criterion: { type: 'CARDS_RECYCLED', threshold: 50 },
    reward: { tokens: 0, dust: 200, xp: 0 },
  },

  // collection_rarity
  {
    key: 'own_rare_10',
    name: 'Chasseur de raretés',
    description: 'Posséder 10 cartes rares.',
    family: 'collection_rarity',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'OWN_RARITY_COUNT', rarity: 'RARE', threshold: 10 },
    reward: { tokens: 20, dust: 0, xp: 0 },
  },
  {
    key: 'own_epic_5',
    name: "Amateur d'épiques",
    description: 'Posséder 5 cartes épiques.',
    family: 'collection_rarity',
    tier: 1,
    hidden: false,
    sortOrder: 2,
    criterion: { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },
    reward: { tokens: 50, dust: 0, xp: 0 },
  },
  {
    key: 'own_legendary_1',
    name: 'Première légende',
    description: 'Posséder 1 carte légendaire.',
    family: 'collection_rarity',
    tier: 2,
    hidden: false,
    sortOrder: 3,
    criterion: { type: 'OWN_RARITY_COUNT', rarity: 'LEGENDARY', threshold: 1 },
    reward: { tokens: 25, dust: 100, xp: 0 },
  },
  {
    key: 'own_legendary_5',
    name: 'Légende confirmée',
    description: 'Posséder 5 cartes légendaires.',
    family: 'collection_rarity',
    tier: 3,
    hidden: false,
    sortOrder: 4,
    criterion: { type: 'OWN_RARITY_COUNT', rarity: 'LEGENDARY', threshold: 5 },
    reward: { tokens: 0, dust: 200, xp: 0, cardRarity: 'EPIC' },
  },
  {
    key: 'own_holographic_1',
    name: 'Holographie',
    description: 'Posséder 1 carte holographique.',
    family: 'collection_rarity',
    tier: 4,
    hidden: false,
    sortOrder: 5,
    criterion: {
      type: 'OWN_RARITY_COUNT',
      variant: 'HOLOGRAPHIC',
      threshold: 1,
    },
    reward: { tokens: 50, dust: 300, xp: 0 },
  },

  // collection_variants
  {
    key: 'own_brilliant_1',
    name: 'Premier éclat',
    description: 'Posséder 1 carte brillante.',
    family: 'collection_variants',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 1 },
    reward: { tokens: 20, dust: 0, xp: 0 },
  },
  {
    key: 'own_brilliant_5',
    name: 'Éclat persistant',
    description: 'Posséder 5 cartes brillantes.',
    family: 'collection_variants',
    tier: 1,
    hidden: false,
    sortOrder: 2,
    criterion: { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 5 },
    reward: { tokens: 50, dust: 100, xp: 0 },
  },
  {
    key: 'same_card_two_variants',
    name: 'Double face',
    description: "Posséder 2 variantes d'une même carte.",
    family: 'collection_variants',
    tier: 2,
    hidden: false,
    sortOrder: 3,
    criterion: { type: 'CUSTOM_EVENT', handlerKey: 'same_card_two_variants' },
    reward: { tokens: 30, dust: 200, xp: 0 },
  },

  // collection_complete
  {
    key: 'complete_common',
    name: 'Collection commune',
    description: 'Posséder toutes les cartes communes.',
    family: 'collection_complete',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'COLLECTION_COMPLETE', scope: { rarity: 'COMMON' } },
    reward: { tokens: 100, dust: 0, xp: 0 },
  },
  {
    key: 'complete_1_set',
    name: 'Set complet',
    description: 'Compléter entièrement un set de cartes.',
    family: 'collection_sets',
    tier: 0,
    hidden: false,
    sortOrder: 0,
    criterion: { type: 'SETS_COMPLETED', threshold: 1 },
    reward: { tokens: 150, dust: 0, xp: 0, cardRarity: 'EPIC' },
  },
  {
    key: 'complete_3_sets',
    name: 'Collectionneur chevronné',
    description: 'Compléter entièrement 3 sets de cartes.',
    family: 'collection_sets',
    tier: 1,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'SETS_COMPLETED', threshold: 3 },
    reward: { tokens: 300, dust: 0, xp: 0, cardRarity: 'LEGENDARY' },
  },
  {
    key: 'complete_5_sets',
    name: 'Maître collectionneur',
    description: 'Compléter entièrement 5 sets de cartes.',
    family: 'collection_sets',
    tier: 2,
    hidden: false,
    sortOrder: 2,
    criterion: { type: 'SETS_COMPLETED', threshold: 5 },
    reward: { tokens: 500, dust: 0, xp: 0, cardRarity: 'LEGENDARY' },
  },

  // streak
  {
    key: 'streak_30',
    name: 'Mois complet',
    description: 'Atteindre 30 jours de série.',
    family: 'streak',
    tier: 0,
    hidden: false,
    sortOrder: 1,
    criterion: { type: 'STREAK_REACHED', threshold: 30 },
    reward: { tokens: 200, dust: 500, xp: 0 },
  },

  // cachés
  {
    key: 'first_pull',
    name: 'Bienvenue',
    description: 'Réaliser votre tout premier tirage.',
    family: null,
    tier: 0,
    hidden: true,
    sortOrder: 0,
    criterion: { type: 'CUSTOM_EVENT', handlerKey: 'first_pull_ever' },
    reward: { tokens: 20, dust: 0, xp: 0 },
  },
  {
    key: 'rainbow_day',
    name: 'Arc-en-ciel',
    description:
      'Obtenir une carte commune, peu commune, rare et épique dans la même journée.',
    family: null,
    tier: 0,
    hidden: true,
    sortOrder: 0,
    criterion: { type: 'CUSTOM_EVENT', handlerKey: 'four_rarities_one_day' },
    reward: { tokens: 0, dust: 0, xp: 0, cardRarity: 'EPIC' },
  },
  {
    key: 'dust_hoarder',
    name: 'Pactole',
    description: 'Atteindre 10 000 de poussière.',
    family: null,
    tier: 0,
    hidden: true,
    sortOrder: 0,
    criterion: { type: 'CUSTOM_EVENT', handlerKey: 'dust_balance_10k' },
    reward: { tokens: 50, dust: 0, xp: 0 },
  },
]

export async function seedAchievements(tx: Tx) {
  for (const entry of ENTRIES) {
    const rewardData = {
      tokens: entry.reward.tokens,
      dust: entry.reward.dust,
      xp: entry.reward.xp,
      cardRarity: entry.reward.cardRarity ?? null,
    }
    await tx.achievement.upsert({
      where: { key: entry.key },
      create: {
        key: entry.key,
        name: entry.name,
        description: entry.description,
        family: entry.family,
        tier: entry.tier,
        hidden: entry.hidden,
        sortOrder: entry.sortOrder,
        isActive: true,
        criterion: entry.criterion,
        reward: { create: rewardData },
      },
      update: {
        name: entry.name,
        description: entry.description,
        family: entry.family,
        tier: entry.tier,
        hidden: entry.hidden,
        sortOrder: entry.sortOrder,
        isActive: true,
        criterion: entry.criterion,
        reward: { update: rewardData },
      },
    })
  }
}
