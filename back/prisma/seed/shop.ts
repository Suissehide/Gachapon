import type { PrismaClient } from '../../src/generated/client'

const SHOP_ITEMS = [
  // Packs de jetons — achetés avec l'or gagné en campagne
  {
    name: 'Pack Starter',
    description: '10 jetons pour démarrer ton aventure.',
    type: 'TOKEN_PACK' as const,
    cost: 1000,
    currency: 'GOLD' as const,
    value: { tokens: 10 },
  },
  {
    name: 'Pack Aventurier',
    description: '50 jetons — le meilleur rapport qualité/prix.',
    type: 'TOKEN_PACK' as const,
    cost: 4500,
    currency: 'GOLD' as const,
    value: { tokens: 50 },
  },
  {
    name: 'Pack Légende',
    description: '150 jetons pour les collectionneurs sérieux.',
    type: 'TOKEN_PACK' as const,
    cost: 12000,
    currency: 'GOLD' as const,
    value: { tokens: 150 },
  },
  // Packs d'énergie — points de combat achetés avec la poussière.
  // L'énergie achetée peut dépasser le plafond (overcap) ; la regen naturelle
  // reste en pause tant qu'on est au-dessus.
  {
    name: 'Petite recharge',
    description: '+15 points de combat, même au-delà du plafond.',
    type: 'ENERGY_PACK' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { combatPoints: 15 },
  },
  {
    name: 'Recharge',
    description: '+40 points de combat — le bon compromis.',
    type: 'ENERGY_PACK' as const,
    cost: 380,
    currency: 'DUST' as const,
    value: { combatPoints: 40 },
  },
  {
    name: 'Grande recharge',
    description: '+90 points de combat pour enchaîner les batailles.',
    type: 'ENERGY_PACK' as const,
    cost: 810,
    currency: 'DUST' as const,
    value: { combatPoints: 90 },
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
      "Multiplie par 3 les chances d'obtenir des cartes EPIC pendant 10 tirages.",
    type: 'BOOST' as const,
    cost: 500,
    currency: 'DUST' as const,
    value: { multiplier: 3, rarity: 'EPIC', pulls: 10 },
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
