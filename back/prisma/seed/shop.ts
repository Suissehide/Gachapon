import type { PrismaClient } from '../../src/generated/client'

const SHOP_ITEMS = [
  // Packs de tokens
  {
    name: 'Pack Starter',
    description: '10 tokens pour démarrer ton aventure.',
    type: 'TOKEN_PACK' as const,
    dustCost: 100,
    value: { tokens: 10 },
  },
  {
    name: 'Pack Aventurier',
    description: '50 tokens — le meilleur rapport qualité/prix.',
    type: 'TOKEN_PACK' as const,
    dustCost: 450,
    value: { tokens: 50 },
  },
  {
    name: 'Pack Légende',
    description: '150 tokens pour les collectionneurs sérieux.',
    type: 'TOKEN_PACK' as const,
    dustCost: 1200,
    value: { tokens: 150 },
  },
  // Boosts
  {
    name: 'Boost Rare+',
    description: 'Multiplie par 2 les chances d\'obtenir des cartes RARE pendant 10 tirages.',
    type: 'BOOST' as const,
    dustCost: 200,
    value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
  },
  {
    name: 'Boost Épique',
    description: 'Garantit au moins une carte EPIC dans les 5 prochains tirages.',
    type: 'BOOST' as const,
    dustCost: 500,
    value: { guaranteedRarity: 'EPIC', pulls: 5 },
  },
  // Cosmétiques
  {
    name: 'Cadre Doré',
    description: 'Un cadre doré pour mettre en valeur ta carte préférée.',
    type: 'COSMETIC' as const,
    dustCost: 300,
    value: { frame: 'golden' },
  },
  {
    name: 'Fond Étoilé',
    description: 'Un fond étoilé pour personnaliser ton profil.',
    type: 'COSMETIC' as const,
    dustCost: 150,
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
