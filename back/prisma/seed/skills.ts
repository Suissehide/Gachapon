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
  //    [Ferveur]      [Trop-plein]
  //        |          /        \
  //   [Multi-jetons]      [Tirage gratuit]
  //        \                    /
  //       [Regen]          [Stockage]
  //            \           /
  //             (center)
  //
  //  Grande réserve et Second souffle ont disparu : tous deux reprenaient
  //  l'effectType de leur porte (TOKEN_VAULT, REGEN) en rendant PLUS au
  //  point, ce qui rendait les paliers 2+ de la porte invendables. Leur
  //  plafond est reparti dans Stockage et Régénération.
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
      // Plafond ramené de 30 à 20 min : l'intervalle plancher passe de 30 à
      // 40 min, soit 36 jetons/jour au lieu de 48. Le buff de Stockage
      // ci-dessous est ce qui amortit l'absence, pas la vitesse de regen.
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 9 },
          { level: 3, effect: 12 },
          { level: 4, effect: 15 },
          { level: 5, effect: 20 },
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
      maxLevel: 6,
      effectType: 'TOKEN_VAULT',
      posX: 72,
      posY: -168,
      // Absorbe Grande réserve ET encaisse un buff : +22 au lieu de +14
      // (6 + 8 avant). Plafond 32 jetons, soit ~21 h d'accumulation
      // hors-ligne à 40 min l'unité, contre 10 h auparavant.
      levels: {
        create: [
          { level: 1, effect: 4 },
          { level: 2, effect: 8 },
          { level: 3, effect: 12 },
          { level: 4, effect: 16 },
          { level: 5, effect: 19 },
          { level: 6, effect: 22 },
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
      maxLevel: 5,
      effectType: 'MULTI_TOKEN_CHANCE',
      posX: -72,
      posY: -336,
      // Reprend le plafond de Déferlante (6 + 6 = 12 %), qui change d'effet
      // ci-dessous : sans ça, la refonte nerferait le multi-jetons de moitié.
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 6 },
          { level: 4, effect: 9 },
          { level: 5, effect: 12 },
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
  const tropPlein = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Trop-plein',
      description:
        'Les jetons régénérés au-delà du plafond reviennent en poussière',
      icon: 'Droplets',
      maxLevel: 3,
      effectType: 'TOKEN_OVERFLOW_DUST',
      posX: 0,
      posY: -504,
      // En tension volontaire avec Stockage : plus la réserve est grande,
      // moins on déborde. Qui maxe l'un n'a pas besoin de l'autre — c'est
      // l'arbitrage que le nœud apporte, à la place du doublon de
      // MULTI_TOKEN_CHANCE qu'il portait avant.
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 30 },
        ],
      },
    },
  })
  const ferveur = await tx.skillNode.create({
    data: {
      branchId: flux.id,
      name: 'Ferveur',
      description: "Bonus d'XP par tirage",
      icon: 'BookOpen',
      maxLevel: 4,
      effectType: 'PULL_XP_BONUS',
      posX: -144,
      posY: -504,
      levels: {
        create: [
          { level: 1, effect: 3 },
          { level: 2, effect: 6 },
          { level: 3, effect: 9 },
          { level: 4, effect: 12 },
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
        toNodeId: tropPlein.id,
        minLevel: 1,
        sourceHandle: 's-top',
        targetHandle: 't-left',
      },
      {
        fromNodeId: tirageGratuitFlux.id,
        toNodeId: tropPlein.id,
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
    ],
  })

  // ══════════════════════════════════════════════
  //  FORTUNE — spreads right from center (right handle)
  //
  //                            [Destin]
  //                           /
  //  (center) — [Chance] — [Boule d'or]  — [Opulence]
  //                      \— [Tirage gratuit] —/
  //                       [Tirage gratuit] —[Prisme]
  //
  //  Kaléidoscope a disparu (doublon de VARIANT_LUCK avec Prisme, et plus
  //  rentable au point que lui). Apogée de Fortune dupliquait LUCK avec
  //  Chance : elle garde sa place en capstone mais change d'effet — la
  //  branche n'avait plus aucun levier gacha neuf à offrir.
  // ══════════════════════════════════════════════

  const luck = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Chance',
      description:
        "Multiplie les chances de tirer une carte Rare ou mieux (jusqu'à ×1,12)",
      icon: 'Star',
      maxLevel: 5,
      effectType: 'LUCK',
      posX: 216,
      posY: -48,
      // Reprend le plafond d'Apogée de Fortune (×1,05 + ×1,07 = ×1,12), qui
      // change d'effet ci-dessous : sans ça, la refonte nerferait le
      // multiplicateur de rareté de plus de moitié.
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 6 },
          { level: 4, effect: 9 },
          { level: 5, effect: 12 },
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
      maxLevel: 4,
      effectType: 'GOLDEN_BALL_CHANCE',
      posX: 408,
      posY: -120,
      levels: {
        create: [
          { level: 1, effect: 2 },
          { level: 2, effect: 4 },
          { level: 3, effect: 6 },
          { level: 4, effect: 8 },
        ],
      },
    },
  })
  const voeuExauce = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Vœu exaucé',
      description:
        "Chance qu'un tirage donne une carte souhaitée de même rareté",
      icon: 'Star',
      maxLevel: 4,
      effectType: 'WISHLIST_PULL_CHANCE',
      posX: 408,
      posY: 24,
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 30 },
          { level: 4, effect: 40 },
        ],
      },
    },
  })
  const opulence = await tx.skillNode.create({
    data: {
      branchId: fortune.id,
      name: 'Opulence',
      description:
        "Relève la limite journalière d'achat de packs d'énergie (3 → 6)",
      icon: 'PackagePlus',
      maxLevel: 2,
      effectType: 'ENERGY_PACK_CAP',
      posX: 600,
      posY: -48,
      // Fortune au sens richesse, pas au sens hasard : l'espace gacha était
      // déjà saturé par Chance, Boule d'or, Tirage gratuit, Destin et
      // Prisme — c'est précisément pourquoi ce nœud était un doublon.
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
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
      maxLevel: 5,
      effectType: 'PITY_BOOST',
      posX: 600,
      posY: -192,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 20 },
          { level: 4, effect: 30 },
          { level: 5, effect: 40 },
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
      maxLevel: 5,
      effectType: 'VARIANT_LUCK',
      posX: 600,
      posY: 120,
      // Absorbe Kaléidoscope : 8 + 6 = +14 %, même plafond qu'avant, en une
      // seule courbe décroissante au lieu de deux nœuds dont le second
      // rendait plus au point que le premier.
      levels: {
        create: [
          { level: 1, effect: 4 },
          { level: 2, effect: 7 },
          { level: 3, effect: 10 },
          { level: 4, effect: 12 },
          { level: 5, effect: 14 },
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
        toNodeId: voeuExauce.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: bouleDor.id,
        toNodeId: opulence.id,
        minLevel: 1,
        sourceHandle: 's-right',
        targetHandle: 't-left',
      },
      {
        fromNodeId: voeuExauce.id,
        toNodeId: opulence.id,
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
        fromNodeId: voeuExauce.id,
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
  //  Les deux racines sont les nœuds les plus DÉSIRABLES : la branche était
  //  délaissée parce qu'elle s'ouvrait sur des remises, effet invisible au
  //  premier point. « Étal élargi » se voit dès la boutique du lendemain.
  //
  //              (center)
  //               /        \
  //    [Étal élargi]        [Recyclage]
  //          |               /        \
  //  [Apogée Collection] [Artisan]  [Réduction]
  //          |                \      /
  //    [Négociant]           [Marchandeur]
  // ══════════════════════════════════════════════

  const recyclage = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Recyclage',
      description: 'Plus de poussière lors du recyclage de doublons',
      icon: 'RefreshCw',
      maxLevel: 5,
      effectType: 'DUST_HARVEST',
      posX: -72,
      posY: 168,
      levels: {
        create: [
          { level: 1, effect: 8 },
          { level: 2, effect: 14 },
          { level: 3, effect: 20 },
          { level: 4, effect: 25 },
          { level: 5, effect: 30 },
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
      maxLevel: 5,
      effectType: 'SHOP_DISCOUNT',
      posX: 0,
      posY: 336,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 9 },
          { level: 3, effect: 12 },
          { level: 4, effect: 15 },
          { level: 5, effect: 18 },
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
      maxLevel: 5,
      effectType: 'UPGRADE_DUST_DISCOUNT',
      posX: -144,
      posY: 336,
      levels: {
        create: [
          { level: 1, effect: 8 },
          { level: 2, effect: 15 },
          { level: 3, effect: 21 },
          { level: 4, effect: 26 },
          { level: 5, effect: 30 },
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
      posX: -72,
      posY: 504,
      levels: {
        create: [
          { level: 1, effect: 7 },
          { level: 2, effect: 13 },
          { level: 3, effect: 18 },
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
      maxLevel: 4,
      effectType: 'DAILY_SHOP_LUCK',
      posX: 144,
      posY: 336,
      levels: {
        create: [
          { level: 1, effect: 10 },
          { level: 2, effect: 20 },
          { level: 3, effect: 35 },
          { level: 4, effect: 50 },
        ],
      },
    },
  })
  const collectionneur = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Collectionneur',
      description:
        "Emplacements de vœu supplémentaires (2 de base)",
      icon: 'Heart',
      maxLevel: 3,
      effectType: 'WISHLIST_SLOTS',
      posX: 144,
      posY: 504,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
          { level: 3, effect: 3 },
        ],
      },
    },
  })
  const etalElargi = await tx.skillNode.create({
    data: {
      branchId: collection.id,
      name: 'Étal élargi',
      description: 'Cartes supplémentaires à la boutique du jour',
      icon: 'Store',
      maxLevel: 2,
      effectType: 'DAILY_SHOP_SLOT',
      posX: 144,
      posY: 168,
      levels: {
        create: [
          { level: 1, effect: 1 },
          { level: 2, effect: 2 },
        ],
      },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      {
        fromNodeId: etalElargi.id,
        toNodeId: apexCollection.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
      {
        fromNodeId: apexCollection.id,
        toNodeId: collectionneur.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-top',
      },
      {
        fromNodeId: recyclage.id,
        toNodeId: artisan.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-right',
      },
      {
        fromNodeId: recyclage.id,
        toNodeId: reduction.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-left',
      },
      {
        fromNodeId: artisan.id,
        toNodeId: marchandeur.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-left',
      },
      {
        fromNodeId: reduction.id,
        toNodeId: marchandeur.id,
        minLevel: 1,
        sourceHandle: 's-bottom',
        targetHandle: 't-right',
      },
    ],
  })

  // ══════════════════════════════════════════════
  //  COMBAT — spreads leftward from center (left handle)
  //
  //             [Butin doré]
  //            /             \
  //  [Endurance]—[Logistique]  [Apogée de Combat] — [Forgeron]
  //            \             /
  //          [Récupération]—[Vétéran] — [Ferrailleur]
  // ══════════════════════════════════════════════

  const endurance = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Endurance',
      description: "Augmente le stock maximum d'énergie",
      icon: 'BatteryCharging',
      maxLevel: 5,
      effectType: 'PC_VAULT',
      posX: -216,
      posY: -96,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
          { level: 4, effect: 20 },
          { level: 5, effect: 25 },
        ],
      },
    },
  })
  const recuperation = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Récupération',
      description: "Réduit le délai de régénération de l'énergie",
      icon: 'Timer',
      maxLevel: 4,
      effectType: 'PC_REGEN',
      posX: -216,
      posY: 96,
      levels: {
        create: [
          { level: 1, effect: 60 },
          { level: 2, effect: 120 },
          { level: 3, effect: 180 },
          { level: 4, effect: 210 },
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
      maxLevel: 4,
      effectType: 'GOLD_BONUS',
      posX: -408,
      posY: -144,
      levels: {
        create: [
          { level: 1, effect: 3 },
          { level: 2, effect: 6 },
          { level: 3, effect: 10 },
          { level: 4, effect: 13 },
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
      maxLevel: 5,
      effectType: 'COMBAT_XP_BONUS',
      posX: -408,
      posY: 144,
      levels: {
        create: [
          { level: 1, effect: 3 },
          { level: 2, effect: 7 },
          { level: 3, effect: 10 },
          { level: 4, effect: 14 },
          { level: 5, effect: 17 },
        ],
      },
    },
  })
  const apexCombat = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Apogée de Combat',
      description: "Bonus de chance d'équipement en combat",
      icon: 'Swords',
      maxLevel: 4,
      effectType: 'DROP_BONUS',
      posX: -600,
      posY: 0,
      levels: {
        create: [
          { level: 1, effect: 12 },
          { level: 2, effect: 22 },
          { level: 3, effect: 31 },
          { level: 4, effect: 40 },
        ],
      },
    },
  })
  const forgeron = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Forgeron',
      description: "Réduit le coût en or d'amélioration des équipements",
      icon: 'Anvil',
      maxLevel: 3,
      effectType: 'EQUIP_UPGRADE_DISCOUNT',
      posX: -792,
      posY: 0,
      levels: {
        create: [
          { level: 1, effect: 5 },
          { level: 2, effect: 10 },
          { level: 3, effect: 15 },
        ],
      },
    },
  })
  const ferrailleur = await tx.skillNode.create({
    data: {
      branchId: combat.id,
      name: 'Ferrailleur',
      description: "Plus d'or au recyclage des équipements",
      icon: 'Recycle',
      maxLevel: 3,
      effectType: 'SALVAGE_BONUS',
      posX: -600,
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
      {
        fromNodeId: apexCombat.id,
        toNodeId: forgeron.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
      {
        fromNodeId: veteran.id,
        toNodeId: ferrailleur.id,
        minLevel: 1,
        sourceHandle: 's-left',
        targetHandle: 't-right',
      },
    ],
  })

  // Compté, jamais recopié : le total annonçait encore 126 points alors que
  // l'arbre était passé à 109.
  const noeuds = await tx.skillNode.findMany({ select: { maxLevel: true } })
  const points = noeuds.reduce((somme, n) => somme + n.maxLevel, 0)
  console.log(
    `  Skill tree seedé : 4 branches, ${noeuds.length} nœuds, ${points} points investissables`,
  )
}
