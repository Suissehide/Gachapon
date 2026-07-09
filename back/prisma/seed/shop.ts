import type { PrismaClient } from '../../src/generated/client'

const SHOP_ITEMS = [
  // Packs de tokens — achetés avec l'or gagné en campagne
  {
    name: 'Pack Starter',
    description: '10 tokens pour démarrer ton aventure.',
    type: 'TOKEN_PACK' as const,
    cost: 1000,
    currency: 'GOLD' as const,
    value: { tokens: 10 },
  },
  {
    name: 'Pack Aventurier',
    description: '50 tokens — le meilleur rapport qualité/prix.',
    type: 'TOKEN_PACK' as const,
    cost: 4500,
    currency: 'GOLD' as const,
    value: { tokens: 50 },
  },
  {
    name: 'Pack Légende',
    description: '150 tokens pour les collectionneurs sérieux.',
    type: 'TOKEN_PACK' as const,
    cost: 12000,
    currency: 'GOLD' as const,
    value: { tokens: 150 },
  },
  // Boosts
  {
    name: 'Boost Rare+',
    description:
      "Multiplie par 2 les chances d'obtenir des cartes RARE pendant 10 tirages.",
    type: 'BOOST' as const,
    cost: 200,
    currency: 'DUST' as const,
    value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
  },
  {
    name: 'Boost Épique',
    description:
      'Garantit au moins une carte EPIC dans les 5 prochains tirages.',
    type: 'BOOST' as const,
    cost: 500,
    currency: 'DUST' as const,
    value: { guaranteedRarity: 'EPIC', pulls: 5 },
  },
  // Cosmétiques
  {
    name: 'Cadre Doré',
    description: 'Un cadre doré pour mettre en valeur ta carte préférée.',
    type: 'COSMETIC' as const,
    cost: 300,
    currency: 'DUST' as const,
    value: { frame: 'golden' },
  },
  {
    name: 'Fond Étoilé',
    description: 'Un fond étoilé pour personnaliser ton profil.',
    type: 'COSMETIC' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { background: 'starfield' },
  },
] as const

export async function seedShop(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const item of SHOP_ITEMS) {
    await tx.shopItem.create({ data: item })
  }

  console.log(`  ${SHOP_ITEMS.length} articles boutique créés`)
}
