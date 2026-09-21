import type { PrismaClient } from '../../src/generated/client'

export const SHOP_ITEMS = [
  // Packs de jetons — achetés avec l'or gagné en campagne
  {
    nameFr: 'Pack Starter',
    nameEn: 'Pack Starter',
    descriptionFr: '10 jetons pour démarrer ton aventure.',
    descriptionEn: '10 jetons pour démarrer ton aventure.',
    type: 'TOKEN_PACK' as const,
    cost: 5000,
    currency: 'GOLD' as const,
    value: { tokens: 10 },
  },
  {
    nameFr: 'Pack Aventurier',
    nameEn: 'Pack Aventurier',
    descriptionFr: '50 jetons — le bon compromis.',
    descriptionEn: '50 jetons — le bon compromis.',
    type: 'TOKEN_PACK' as const,
    cost: 22500,
    currency: 'GOLD' as const,
    value: { tokens: 50 },
  },
  {
    nameFr: 'Pack Légende',
    nameEn: 'Pack Légende',
    descriptionFr: '150 jetons — le meilleur rapport or/jeton.',
    descriptionEn: '150 jetons — le meilleur rapport or/jeton.',
    type: 'TOKEN_PACK' as const,
    cost: 60000,
    currency: 'GOLD' as const,
    value: { tokens: 150 },
  },
  // Packs d'énergie — points de combat achetés avec la poussière.
  // L'énergie achetée peut dépasser le plafond (overcap) ; la regen naturelle
  // reste en pause tant qu'on est au-dessus.
  //
  // ×3 le 2026-09-21. À 18-20 poussière par point d'énergie, les packs
  // coûtaient MOINS que ce que cette énergie rapporte en farmant : 21,6
  // poussière par point au boss 9-10, soit 120 % remboursés dès le chapitre 8.
  // Acheter de l'énergie était donc un gain net de poussière, et
  // `shop.energyDailyCap` restait le seul frein du jeu. Le prix vise désormais
  // ~2,5× le meilleur rendement de farm : on paie de la poussière pour de
  // l'or, de l'XP et de l'équipement, plus jamais pour de la poussière.
  // Gardé par `src/test/unit/energy-pack-pricing.test.ts`, qui relit la courbe
  // de butin réelle — rebuffer le farm sans retoucher ces prix le fera échouer.
  {
    nameFr: 'Petite recharge',
    nameEn: 'Petite recharge',
    descriptionFr: '+15 points de combat, même au-delà du plafond.',
    descriptionEn: '+15 points de combat, même au-delà du plafond.',
    type: 'ENERGY_PACK' as const,
    cost: 900,
    currency: 'DUST' as const,
    value: { combatPoints: 15 },
  },
  {
    nameFr: 'Recharge',
    nameEn: 'Recharge',
    descriptionFr: '+40 points de combat — le bon compromis.',
    descriptionEn: '+40 points de combat — le bon compromis.',
    type: 'ENERGY_PACK' as const,
    cost: 2280,
    currency: 'DUST' as const,
    value: { combatPoints: 40 },
  },
  {
    nameFr: 'Grande recharge',
    nameEn: 'Grande recharge',
    descriptionFr: '+90 points de combat pour enchaîner les batailles.',
    descriptionEn: '+90 points de combat pour enchaîner les batailles.',
    type: 'ENERGY_PACK' as const,
    cost: 4860,
    currency: 'DUST' as const,
    value: { combatPoints: 90 },
  },
  // Boosts
  {
    nameFr: 'Boost Rare+',
    nameEn: 'Boost Rare+',
    descriptionFr:
      "Multiplie par 2 les chances d'obtenir des cartes RARE pendant 10 tirages.",
    descriptionEn:
      "Multiplie par 2 les chances d'obtenir des cartes RARE pendant 10 tirages.",
    type: 'BOOST' as const,
    cost: 200,
    currency: 'DUST' as const,
    value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
  },
  {
    nameFr: 'Boost Épique',
    nameEn: 'Boost Épique',
    descriptionFr:
      "Multiplie par 2 les chances d'obtenir des cartes EPIC pendant 10 tirages.",
    descriptionEn:
      "Multiplie par 2 les chances d'obtenir des cartes EPIC pendant 10 tirages.",
    type: 'BOOST' as const,
    cost: 800,
    currency: 'DUST' as const,
    value: { multiplier: 2, rarity: 'EPIC', pulls: 10 },
  },
  // Cosmétiques
  {
    nameFr: 'Cadre Doré',
    nameEn: 'Cadre Doré',
    descriptionFr: 'Un cadre doré pour mettre en valeur ta carte préférée.',
    descriptionEn: 'Un cadre doré pour mettre en valeur ta carte préférée.',
    type: 'COSMETIC' as const,
    cost: 300,
    currency: 'DUST' as const,
    value: { frame: 'golden' },
  },
  {
    nameFr: 'Fond Étoilé',
    nameEn: 'Fond Étoilé',
    descriptionFr: 'Un fond étoilé pour personnaliser ton profil.',
    descriptionEn: 'Un fond étoilé pour personnaliser ton profil.',
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
