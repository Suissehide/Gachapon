/**
 * Définitions de la boutique.
 *
 * Vit sous `src/main/` et non dans `prisma/seed/` parce que du code de
 * PRODUCTION la consomme : le backfill de traductions au démarrage doit lire
 * ces libellés, et `npm run build` ne transpile que `src/main/`.
 * `prisma/seed/shop.ts` n'y garde que l'écriture en base.
 */

export const SHOP_ITEMS = [
  // Packs de jetons — achetés avec l'or gagné en campagne
  {
    nameFr: 'Pack Starter',
    nameEn: 'Starter Pack',
    descriptionFr: '10 jetons pour démarrer ton aventure.',
    descriptionEn: '10 tokens to kick off your adventure.',
    type: 'TOKEN_PACK' as const,
    cost: 5000,
    currency: 'GOLD' as const,
    value: { tokens: 10 },
  },
  {
    nameFr: 'Pack Aventurier',
    nameEn: 'Adventurer Pack',
    descriptionFr: '50 jetons — le bon compromis.',
    descriptionEn: '50 tokens — the solid middle ground.',
    type: 'TOKEN_PACK' as const,
    cost: 22500,
    currency: 'GOLD' as const,
    value: { tokens: 50 },
  },
  {
    nameFr: 'Pack Légende',
    nameEn: 'Legend Pack',
    descriptionFr: '150 jetons — le meilleur rapport or/jeton.',
    descriptionEn: '150 tokens — the best gold-per-token value.',
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
    nameEn: 'Small Refill',
    descriptionFr: '+15 points de combat, même au-delà du plafond.',
    descriptionEn: '+15 combat points, even above the cap.',
    type: 'ENERGY_PACK' as const,
    cost: 900,
    currency: 'DUST' as const,
    value: { combatPoints: 15 },
  },
  {
    nameFr: 'Recharge',
    nameEn: 'Refill',
    descriptionFr: '+40 points de combat — le bon compromis.',
    descriptionEn: '+40 combat points — the solid middle ground.',
    type: 'ENERGY_PACK' as const,
    cost: 2280,
    currency: 'DUST' as const,
    value: { combatPoints: 40 },
  },
  {
    nameFr: 'Grande recharge',
    nameEn: 'Large Refill',
    descriptionFr: '+90 points de combat pour enchaîner les batailles.',
    descriptionEn: '+90 combat points to chain battles back-to-back.',
    type: 'ENERGY_PACK' as const,
    cost: 4860,
    currency: 'DUST' as const,
    value: { combatPoints: 90 },
  },
  // Boosts
  {
    nameFr: 'Boost Rare+',
    nameEn: 'Rare+ Boost',
    descriptionFr:
      "Multiplie par 2 les chances d'obtenir des cartes RARE pendant 10 tirages.",
    descriptionEn: 'Doubles your odds of pulling RARE cards for 10 pulls.',
    type: 'BOOST' as const,
    cost: 200,
    currency: 'DUST' as const,
    value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
  },
  {
    nameFr: 'Boost Épique',
    nameEn: 'Epic Boost',
    descriptionFr:
      "Multiplie par 2 les chances d'obtenir des cartes EPIC pendant 10 tirages.",
    descriptionEn: 'Doubles your odds of pulling EPIC cards for 10 pulls.',
    type: 'BOOST' as const,
    cost: 800,
    currency: 'DUST' as const,
    value: { multiplier: 2, rarity: 'EPIC', pulls: 10 },
  },
  // Jetons astraux — seule voie d'accès aux cartes LUMIÈRE/TÉNÈBRES,
  // exclues du tirage normal (card-pools.ts#ASTRAL_ELEMENTS).
  {
    nameFr: 'Jeton astral',
    nameEn: 'Astral token',
    descriptionFr:
      'Une carte Lumière ou Ténèbres. Rareté tirée comme un tirage normal.',
    descriptionEn: 'One Light or Dark card. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 400,
    currency: 'DUST' as const,
    value: { capsuleType: 'ASTRAL', quantity: 1 },
  },
  {
    nameFr: '10 jetons astraux',
    nameEn: '10 astral tokens',
    descriptionFr:
      'Dix cartes Lumière ou Ténèbres. Rareté tirée comme un tirage normal.',
    descriptionEn: 'Ten Light or Dark cards. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 4000,
    currency: 'DUST' as const,
    value: { capsuleType: 'ASTRAL', quantity: 10 },
  },
  // Jetons élémentaires — une carte de l'élément acheté, au même tirage de
  // rareté que le gacha normal.
  {
    nameFr: 'Jeton Feu',
    nameEn: 'Fire token',
    descriptionFr: 'Une carte Feu. Rareté tirée comme un tirage normal.',
    descriptionEn: 'One Fire card. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { capsuleType: 'FIRE', quantity: 1 },
  },
  {
    nameFr: '10 jetons Feu',
    nameEn: '10 Fire tokens',
    descriptionFr: 'Dix cartes Feu. Rareté tirée comme un tirage normal.',
    descriptionEn: 'Ten Fire cards. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 1500,
    currency: 'DUST' as const,
    value: { capsuleType: 'FIRE', quantity: 10 },
  },
  {
    nameFr: 'Jeton Eau',
    nameEn: 'Water token',
    descriptionFr: 'Une carte Eau. Rareté tirée comme un tirage normal.',
    descriptionEn: 'One Water card. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { capsuleType: 'WATER', quantity: 1 },
  },
  {
    nameFr: '10 jetons Eau',
    nameEn: '10 Water tokens',
    descriptionFr: 'Dix cartes Eau. Rareté tirée comme un tirage normal.',
    descriptionEn: 'Ten Water cards. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 1500,
    currency: 'DUST' as const,
    value: { capsuleType: 'WATER', quantity: 10 },
  },
  {
    nameFr: 'Jeton Nature',
    nameEn: 'Nature token',
    descriptionFr: 'Une carte Nature. Rareté tirée comme un tirage normal.',
    descriptionEn: 'One Nature card. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { capsuleType: 'NATURE', quantity: 1 },
  },
  {
    nameFr: '10 jetons Nature',
    nameEn: '10 Nature tokens',
    descriptionFr: 'Dix cartes Nature. Rareté tirée comme un tirage normal.',
    descriptionEn: 'Ten Nature cards. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 1500,
    currency: 'DUST' as const,
    value: { capsuleType: 'NATURE', quantity: 10 },
  },
  {
    nameFr: 'Jeton Terre',
    nameEn: 'Earth token',
    descriptionFr: 'Une carte Terre. Rareté tirée comme un tirage normal.',
    descriptionEn: 'One Earth card. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { capsuleType: 'EARTH', quantity: 1 },
  },
  {
    nameFr: '10 jetons Terre',
    nameEn: '10 Earth tokens',
    descriptionFr: 'Dix cartes Terre. Rareté tirée comme un tirage normal.',
    descriptionEn: 'Ten Earth cards. Rarity rolled like a normal pull.',
    type: 'CAPSULE' as const,
    cost: 1500,
    currency: 'DUST' as const,
    value: { capsuleType: 'EARTH', quantity: 10 },
  },
  // Jeton Comète — une carte parmi 15 (3 par rareté), liste commune
  // à tous les joueurs, renouvelée chaque lundi (card-pools.ts#cometCapsuleCards).
  {
    nameFr: 'Jeton Comète',
    nameEn: 'Comet token',
    descriptionFr:
      'Une carte parmi les 15 de la sélection de la semaine. Rareté tirée comme un tirage normal.',
    descriptionEn:
      "One card from this week's 15-card selection. Rarity rolled like a normal pull.",
    type: 'CAPSULE' as const,
    cost: 250,
    currency: 'DUST' as const,
    value: { capsuleType: 'COMET', quantity: 1 },
  },
  {
    nameFr: '10 jetons Comète',
    nameEn: '10 Comet tokens',
    descriptionFr:
      'Dix cartes parmi les 15 de la sélection de la semaine. Rareté tirée comme un tirage normal.',
    descriptionEn:
      "Ten cards from this week's 15-card selection. Rarity rolled like a normal pull.",
    type: 'CAPSULE' as const,
    cost: 2500,
    currency: 'DUST' as const,
    value: { capsuleType: 'COMET', quantity: 10 },
  },
  // Cosmétiques
  {
    nameFr: 'Cadre Doré',
    nameEn: 'Golden Frame',
    descriptionFr: 'Un cadre doré pour mettre en valeur ta carte préférée.',
    descriptionEn: 'A golden frame to showcase your favorite card.',
    type: 'COSMETIC' as const,
    cost: 300,
    currency: 'DUST' as const,
    value: { frame: 'golden' },
  },
  {
    nameFr: 'Fond Étoilé',
    nameEn: 'Starry Background',
    descriptionFr: 'Un fond étoilé pour personnaliser ton profil.',
    descriptionEn: 'A starry background to customize your profile.',
    type: 'COSMETIC' as const,
    cost: 150,
    currency: 'DUST' as const,
    value: { background: 'starfield' },
  },
] as const
