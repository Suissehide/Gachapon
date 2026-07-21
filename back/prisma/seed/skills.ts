import type { PrismaClient } from '../../src/generated/client'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export async function seedSkills(tx: Tx) {
  // SkillConfig
  await tx.skillConfig.upsert({
    where: { id: 1 },
    create: { id: 1, resetCostPerPoint: 50 },
    update: {},
  })

  // ══════════════════════════════════════════════
  //  Branches — order maps to center handle:
  //  1 = top, 2 = right, 3 = bottom, 4 = left
  // ══════════════════════════════════════════════

  const flux = await tx.skillBranch.create({
    data: {
      name: 'Flux',
      description: 'Tickets & Énergie',
      icon: 'Zap',
      color: '#6c47ff',
      order: 1,
    },
  })
  const fortune = await tx.skillBranch.create({
    data: {
      name: 'Fortune',
      description: 'Gacha & Chance',
      icon: 'Sparkles',
      color: '#f59e0b',
      order: 2,
    },
  })
  const collection = await tx.skillBranch.create({
    data: {
      name: 'Collection',
      description: 'Dust & Boutique',
      icon: 'Gem',
      color: '#10b981',
      order: 3,
    },
  })
  const combat = await tx.skillBranch.create({
    data: {
      name: 'Combat',
      description: 'Énergie & Butin',
      icon: 'Swords',
      color: '#ef4444',
      order: 4,
    },
  })

  // ══════════════════════════════════════════════
  //  FLUX — spreads upward from center (top handle)
  //
  //    [Ferveur]  [Déferlante]  [Grande réserve]
  //        |       /        \        |
  //   [Multi-jetons]      [Tirage gratuit]
  //        \                    /
  //       [Regen]          [Stockage]
  //            \           /
  //             (center)
  // ══════════════════════════════════════════════

  const regen = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Régénération',
      description: 'Réduit le délai de régénération des jetons',
      icon: 'Timer',
      maxLevel: 5,
      effectType: 'REGEN',
      posX: -72,
      posY: -168,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
          { level: 4, effect: 20 },
          { level: 5, effect: 30 },
        ],
      },
    },
  })
  const stockage = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Stockage',
      description: 'Augmente le stockage max de jetons',
      icon: 'Database',
      maxLevel: 5,
      effectType: 'TOKEN_VAULT',
      posX: 72,
      posY: -168,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 3 },
          { level: 4, effect: 4 },
          { level: 5, effect: 5 },
        ],
      },
    },
  })
  const multiToken = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Multi-jetons',
      description: 'Chance de recevoir plusieurs jetons à la fois',
      icon: 'Layers',
      maxLevel: 3,
      effectType: 'MULTI_TOKEN_CHANCE',
      posX: -72,
      posY: -336,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 6 },
        ],
      },
    },
  })
  const tirageGratuitFlux = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Tirage gratuit',
      description: 'Chance de tirer sans consommer de jeton',
      icon: 'Gift',
      maxLevel: 5,
      effectType: 'FREE_PULL_CHANCE',
      posX: 72,
      posY: -336,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 4 },
          { level: 4, effect: 6 },
          { level: 5, effect: 10 },
        ],
      },
    },
  })
  const tokenSurge = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Déferlante',
      description: 'Boost massif de chance multi-jetons',
      icon: 'Flame',
      maxLevel: 1,
      effectType: 'MULTI_TOKEN_CHANCE',
      posX: 0,
      posY: -504,
      levels: {
        create: [{ level: 1, effect: 4 }],
      },
    },
  })
  const ferveur = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Ferveur',
      description: "Bonus d'XP par tirage",
      icon: 'BookOpen',
      maxLevel: 5,
      effectType: 'PULL_XP_BONUS',
      posX: -144,
      posY: -504,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 3 },
          { level: 4, effect: 4 },
          { level: 5, effect: 7 },
        ],
      },
    },
  })
  const grandeReserve = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Grande réserve',
      description: 'Augmente encore le stockage max de jetons',
      icon: 'Warehouse',
      maxLevel: 2,
      effectType: 'TOKEN_VAULT',
      posX: 144,
      posY: -504,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 5 },
        ],
      },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      {
        fromNodeId: regen.id,
        toNodeId: multiToken.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-bottom',
      },
      {
        fromNodeId: stockage.id,
        toNodeId: tirageGratuitFlux.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-bottom',
      },
      {
        fromNodeId: multiToken.id,
        toNodeId: tokenSurge.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-left',
      },
      {
        fromNodeId: tirageGratuitFlux.id,
        toNodeId: tokenSurge.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-right',
      },
      {
        fromNodeId: multiToken.id,
        toNodeId: ferveur.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-bottom',
      },
      {
        fromNodeId: tirageGratuitFlux.id,
        toNodeId: grandeReserve.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-bottom',
      },
    ],
  })

  // ══════════════════════════════════════════════
  //  FORTUNE — spreads right from center (right handle)
  //
  //  (center) — [Chance] — [Boule d'or]  — [Apogée de Fortune]
  //                      \— [Tirage gratuit] —/
  //                           [Boule d'or] —[Destin]
  //                       [Tirage gratuit] —[Prisme]
  // ══════════════════════════════════════════════

  const luck = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Chance',
      description:
        "Multiplie les chances de tirer une carte Rare ou mieux (jusqu'à ×1,05)",
      icon: 'Star',
      maxLevel: 5,
      effectType: 'LUCK',
      posX: 216,
      posY: -48,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 3 },
          { level: 4, effect: 4 },
          { level: 5, effect: 5 },
        ],
      },
    },
  })
  const bouleDor = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: "Boule d'or",
      description: "Chance d'obtenir une boule en or",
      icon: 'Trophy',
      maxLevel: 3,
      effectType: 'GOLDEN_BALL_CHANCE',
      posX: 408,
      posY: -120,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 6 },
        ],
      },
    },
  })
  const tirageGratuitFortune = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Tirage gratuit',
      description: 'Chance de tirage gratuit via Fortune',
      icon: 'Ticket',
      maxLevel: 5,
      effectType: 'FREE_PULL_CHANCE',
      posX: 408,
      posY: 24,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 3 },
          { level: 3, effect: 5 },
          { level: 4, effect: 7 },
          { level: 5, effect: 12 },
        ],
      },
    },
  })
  const apexFortune = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Apogée de Fortune',
      description:
        "Multiplie encore les chances de Rare+ (jusqu'à ×1,07, cumulable avec Chance)",
      icon: 'Crown',
      maxLevel: 3,
      effectType: 'LUCK',
      posX: 600,
      posY: -48,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 7 },
        ],
      },
    },
  })
  const destin = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Destin',
      description: 'Abaisse le seuil de pitié',
      icon: 'Compass',
      maxLevel: 3,
      effectType: 'PITY_BOOST',
      posX: 600,
      posY: -192,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 20 },
        ],
      },
    },
  })
  const prisme = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Prisme',
      description: 'Augmente les chances de variantes Brillant/Holo',
      icon: 'Diamond',
      maxLevel: 3,
      effectType: 'VARIANT_LUCK',
      posX: 600,
      posY: 120,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 4 },
        ],
      },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      {
        fromNodeId: luck.id,
        toNodeId: bouleDor.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: luck.id,
        toNodeId: tirageGratuitFortune.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: bouleDor.id,
        toNodeId: apexFortune.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: tirageGratuitFortune.id,
        toNodeId: apexFortune.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: bouleDor.id,
        toNodeId: destin.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: tirageGratuitFortune.id,
        toNodeId: prisme.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
    ],
  })

  // ══════════════════════════════════════════════
  //  COLLECTION — spreads downward from center (bottom handle)
  //
  //              (center)
  //               /   \
  //       [Recyclage]  [Réduction]
  //            /           \
  //       [Artisan]    [Marchandeur]
  //        /    \         /    \
  //  [Négociant] [Apogée Collection] [Étal élargi]
  // ══════════════════════════════════════════════

  const recyclage = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Recyclage',
      description: 'Plus de poussière lors du recyclage de doublons',
      icon: 'RefreshCw',
      maxLevel: 3,
      effectType: 'DUST_HARVEST',
      posX: -72,
      posY: 168,
      levels: {
        create: [
          { level: 1, effect: 4 },
          { level: 2, effect: 7 },
          { level: 3, effect: 10 },
        ],
      },
    },
  })
  const reduction = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Réduction',
      description: 'Réduit les prix en poussière de la boutique',
      icon: 'BadgePercent',
      maxLevel: 3,
      effectType: 'SHOP_DISCOUNT',
      posX: 72,
      posY: 168,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 8 },
          { level: 3, effect: 10 },
        ],
      },
    },
  })
  const artisan = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Artisan',
      description: "Réduit le coût en poussière d'amélioration des cartes",
      icon: 'Hammer',
      maxLevel: 3,
      effectType: 'UPGRADE_DUST_DISCOUNT',
      posX: -72,
      posY: 336,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
        ],
      },
    },
  })
  const marchandeur = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Marchandeur',
      description: 'Réduit les prix en or de la boutique',
      icon: 'ShoppingBag',
      maxLevel: 3,
      effectType: 'GOLD_SHOP_DISCOUNT',
      posX: 72,
      posY: 336,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
        ],
      },
    },
  })
  const apexCollection = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Apogée de Collection',
      description: 'Plus de cartes rares dans ta boutique du jour',
      icon: 'Gem',
      maxLevel: 3,
      effectType: 'DAILY_SHOP_LUCK',
      posX: 0,
      posY: 504,
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 35 },
        ],
      },
    },
  })
  const negociant = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Négociant',
      description: 'Réduit le délai du vœu (wishlist)',
      icon: 'Handshake',
      maxLevel: 2,
      effectType: 'WISHLIST_COOLDOWN',
      posX: -144,
      posY: 504,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
        ],
      },
    },
  })
  const etalElargi = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Étal élargi',
      description: '+1 carte à la boutique du jour',
      icon: 'Store',
      maxLevel: 1,
      effectType: 'DAILY_SHOP_SLOT',
      posX: 144,
      posY: 504,
      levels: { create: [{ level: 1, effect: 1 }] },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      {
        fromNodeId: recyclage.id,
        toNodeId: artisan.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
      {
        fromNodeId: reduction.id,
        toNodeId: marchandeur.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
      {
        fromNodeId: artisan.id,
        toNodeId: apexCollection.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-left',
      },
      {
        fromNodeId: marchandeur.id,
        toNodeId: apexCollection.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-right',
      },
      {
        fromNodeId: artisan.id,
        toNodeId: negociant.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
      {
        fromNodeId: marchandeur.id,
        toNodeId: etalElargi.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
    ],
  })

  // ══════════════════════════════════════════════
  //  COMBAT — spreads leftward from center (left handle)
  //
  //             [Butin doré]
  //            /             \
  //  [Endurance]—[Logistique]  [Apogée de Combat]
  //            \             /
  //          [Récupération]—[Vétéran]
  // ══════════════════════════════════════════════

  const endurance = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Endurance',
      description: 'Augmente le stock maximum de PC',
      icon: 'BatteryCharging',
      maxLevel: 3,
      effectType: 'PC_VAULT',
      posX: -216,
      posY: -96,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
        ],
      },
    },
  })
  const recuperation = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Récupération',
      description: 'Réduit le délai de régénération des PC',
      icon: 'Timer',
      maxLevel: 3,
      effectType: 'PC_REGEN',
      posX: -216,
      posY: 96,
      levels: {
        create: [
          { level: 1, effect: 60 },
          { level: 2, effect: 120 },
          { level: 3, effect: 180 },
        ],
      },
    },
  })
  const butinDore = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Butin doré',
      description: 'Bonus de gold sur les victoires',
      icon: 'Coins',
      maxLevel: 3,
      effectType: 'GOLD_BONUS',
      posX: -408,
      posY: -144,
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 30 },
        ],
      },
    },
  })
  const logistique = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Logistique',
      description: 'Réduit le coût du farm',
      icon: 'Truck',
      maxLevel: 1,
      effectType: 'SWEEP_COST',
      posX: -408,
      posY: 0,
      levels: {
        create: [{ level: 1, effect: 1 }],
      },
    },
  })
  const veteran = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Vétéran',
      description: "Bonus d'XP combat",
      icon: 'Medal',
      maxLevel: 3,
      effectType: 'COMBAT_XP_BONUS',
      posX: -408,
      posY: 144,
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 30 },
        ],
      },
    },
  })
  const apexCombat = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Apogée de Combat',
      description: 'Bonus de butin en combat',
      icon: 'Swords',
      maxLevel: 5,
      effectType: 'DROP_BONUS',
      posX: -600,
      posY: 0,
      levels: {
        create: [
          { level: 1, effect: 20 },
          { level: 2, effect: 40 },
          { level: 3, effect: 60 },
          { level: 4, effect: 80 },
          { level: 5, effect: 100 },
        ],
      },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      {
        fromNodeId: endurance.id,
        toNodeId: butinDore.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
      {
        fromNodeId: endurance.id,
        toNodeId: logistique.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
      {
        fromNodeId: recuperation.id,
        toNodeId: veteran.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
      {
        fromNodeId: butinDore.id,
        toNodeId: apexCombat.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
      {
        fromNodeId: veteran.id,
        toNodeId: apexCombat.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
    ],
  })

  console.log(
    '  Skill tree seedé : 4 branches, 26 nœuds, 85 points investissables',
  )
}
