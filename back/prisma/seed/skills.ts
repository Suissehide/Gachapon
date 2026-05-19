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
    data: { name: 'Flux', description: 'Tickets & Énergie', icon: 'Zap', color: '#6c47ff', order: 1 },
  })
  const fortune = await tx.skillBranch.create({
    data: { name: 'Fortune', description: 'Gacha & Chance', icon: 'Sparkles', color: '#f59e0b', order: 2 },
  })
  const collection = await tx.skillBranch.create({
    data: { name: 'Collection', description: 'Dust & Boutique', icon: 'Gem', color: '#10b981', order: 3 },
  })

  // ══════════════════════════════════════════════
  //  FLUX — spreads upward from center (top handle)
  //
  //            [Token Surge]
  //            /           \
  //     [Multi-token]  [Tirage gratuit]
  //            \           /
  //           [Regen]  [Stockage]
  //               \   /
  //              (center)
  // ══════════════════════════════════════════════

  const regen = await tx.skillNode.create({
    data: {
      branchId: flux.id, name: 'Regen', description: 'Réduit le délai de régénération des tickets',
      icon: 'Timer', maxLevel: 3, effectType: 'REGEN', posX: -72, posY: -168,
      levels: { create: [{ level: 1, effect: 2 }, { level: 2, effect: 4 }, { level: 3, effect: 6 }] },
    },
  })
  const stockage = await tx.skillNode.create({
    data: {
      branchId: flux.id, name: 'Stockage', description: 'Augmente le stockage max de tickets',
      icon: 'Database', maxLevel: 3, effectType: 'TOKEN_VAULT', posX: 72, posY: -168,
      levels: { create: [{ level: 1, effect: 5 }, { level: 2, effect: 10 }, { level: 3, effect: 20 }] },
    },
  })
  const multiToken = await tx.skillNode.create({
    data: {
      branchId: flux.id, name: 'Multi-ticket', description: 'Chance de recevoir plusieurs tickets à la fois',
      icon: 'Layers', maxLevel: 3, effectType: 'MULTI_TOKEN_CHANCE', posX: -72, posY: -336,
      levels: { create: [{ level: 1, effect: 0.05 }, { level: 2, effect: 0.1 }, { level: 3, effect: 0.2 }] },
    },
  })
  const tirageGratuitFlux = await tx.skillNode.create({
    data: {
      branchId: flux.id, name: 'Tirage gratuit', description: 'Chance de tirer sans consommer de ticket',
      icon: 'Gift', maxLevel: 3, effectType: 'FREE_PULL_CHANCE', posX: 72, posY: -336,
      levels: { create: [{ level: 1, effect: 0.02 }, { level: 2, effect: 0.04 }, { level: 3, effect: 0.08 }] },
    },
  })
  const tokenSurge = await tx.skillNode.create({
    data: {
      branchId: flux.id, name: 'Ticket Surge', description: 'Boost massif de chance multi-ticket',
      icon: 'Flame', maxLevel: 5, effectType: 'MULTI_TOKEN_CHANCE', posX: 0, posY: -504,
      levels: { create: [{ level: 1, effect: 0.05 }, { level: 2, effect: 0.1 }, { level: 3, effect: 0.2 }, { level: 4, effect: 0.3 }, { level: 5, effect: 0.5 }] },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      { fromNodeId: regen.id, toNodeId: multiToken.id, minLevel: 1, sourceHandle: 's-top', targetHandle: 't-bottom' },
      { fromNodeId: stockage.id, toNodeId: tirageGratuitFlux.id, minLevel: 1, sourceHandle: 's-top', targetHandle: 't-bottom' },
      { fromNodeId: multiToken.id, toNodeId: tokenSurge.id, minLevel: 1, sourceHandle: 's-top', targetHandle: 't-left' },
      { fromNodeId: tirageGratuitFlux.id, toNodeId: tokenSurge.id, minLevel: 1, sourceHandle: 's-top', targetHandle: 't-right' },
    ],
  })

  // ══════════════════════════════════════════════
  //  FORTUNE — spreads right from center (right handle)
  //
  //  (center) — [Luck] — [Boule d'or]  — [Apex Fortune]
  //                    \— [Tirage gratuit] —/
  // ══════════════════════════════════════════════

  const luck = await tx.skillNode.create({
    data: {
      branchId: fortune.id, name: 'Luck', description: 'Augmente les taux de drop des raretés élevées',
      icon: 'Star', maxLevel: 3, effectType: 'LUCK', posX: 216, posY: -48,
      levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.25 }, { level: 3, effect: 0.5 }] },
    },
  })
  const bouleDor = await tx.skillNode.create({
    data: {
      branchId: fortune.id, name: "Boule d'or", description: "Chance d'obtenir une boule en or",
      icon: 'Trophy', maxLevel: 3, effectType: 'GOLDEN_BALL_CHANCE', posX: 408, posY: -120,
      levels: { create: [{ level: 1, effect: 0.03 }, { level: 2, effect: 0.07 }, { level: 3, effect: 0.15 }] },
    },
  })
  const tirageGratuitFortune = await tx.skillNode.create({
    data: {
      branchId: fortune.id, name: 'Tirage gratuit', description: 'Chance de tirage gratuit via Fortune',
      icon: 'Ticket', maxLevel: 3, effectType: 'FREE_PULL_CHANCE', posX: 408, posY: 24,
      levels: { create: [{ level: 1, effect: 0.03 }, { level: 2, effect: 0.06 }, { level: 3, effect: 0.12 }] },
    },
  })
  const apexFortune = await tx.skillNode.create({
    data: {
      branchId: fortune.id, name: 'Apex Fortune', description: 'Maîtrise ultime de la fortune',
      icon: 'Crown', maxLevel: 5, effectType: 'LUCK', posX: 600, posY: -48,
      levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.2 }, { level: 3, effect: 0.35 }, { level: 4, effect: 0.5 }, { level: 5, effect: 0.75 }] },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      { fromNodeId: luck.id, toNodeId: bouleDor.id, minLevel: 1, sourceHandle: 's-right', targetHandle: 't-left' },
      { fromNodeId: luck.id, toNodeId: tirageGratuitFortune.id, minLevel: 1, sourceHandle: 's-right', targetHandle: 't-left' },
      { fromNodeId: bouleDor.id, toNodeId: apexFortune.id, minLevel: 1, sourceHandle: 's-right', targetHandle: 't-left' },
      { fromNodeId: tirageGratuitFortune.id, toNodeId: apexFortune.id, minLevel: 1, sourceHandle: 's-right', targetHandle: 't-left' },
    ],
  })

  // ══════════════════════════════════════════════
  //  COLLECTION — spreads downward from center (bottom handle)
  //
  //              (center)
  //               /   \
  //         [Dust+]  [Réduction]
  //            /           \
  //     [Recyclage+]  [Marchandeur]
  //            \           /
  //         [Apex Collection]
  // ══════════════════════════════════════════════

  const dustPlus = await tx.skillNode.create({
    data: {
      branchId: collection.id, name: 'Dust+', description: 'Plus de dust lors du recyclage de doublons',
      icon: 'Wind', maxLevel: 3, effectType: 'DUST_HARVEST', posX: -72, posY: 168,
      levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.25 }, { level: 3, effect: 0.5 }] },
    },
  })
  const reduction = await tx.skillNode.create({
    data: {
      branchId: collection.id, name: 'Réduction', description: 'Réduit les prix en boutique',
      icon: 'BadgePercent', maxLevel: 3, effectType: 'SHOP_DISCOUNT', posX: 72, posY: 168,
      levels: { create: [{ level: 1, effect: 0.05 }, { level: 2, effect: 0.1 }, { level: 3, effect: 0.2 }] },
    },
  })
  const recyclage = await tx.skillNode.create({
    data: {
      branchId: collection.id, name: 'Recyclage+', description: 'Bonus supplémentaire sur le recyclage',
      icon: 'RefreshCw', maxLevel: 3, effectType: 'DUST_HARVEST', posX: -72, posY: 336,
      levels: { create: [{ level: 1, effect: 0.15 }, { level: 2, effect: 0.3 }, { level: 3, effect: 0.6 }] },
    },
  })
  const marchandeur = await tx.skillNode.create({
    data: {
      branchId: collection.id, name: 'Marchandeur', description: 'Réductions exclusives en boutique',
      icon: 'ShoppingBag', maxLevel: 3, effectType: 'SHOP_DISCOUNT', posX: 72, posY: 336,
      levels: { create: [{ level: 1, effect: 0.08 }, { level: 2, effect: 0.15 }, { level: 3, effect: 0.25 }] },
    },
  })
  const apexCollection = await tx.skillNode.create({
    data: {
      branchId: collection.id, name: 'Apex Collection', description: 'Maîtrise ultime de la collection',
      icon: 'Gem', maxLevel: 5, effectType: 'DUST_HARVEST', posX: 0, posY: 504,
      levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.25 }, { level: 3, effect: 0.5 }, { level: 4, effect: 0.75 }, { level: 5, effect: 1.0 }] },
    },
  })
  await tx.skillEdge.createMany({
    data: [
      { fromNodeId: dustPlus.id, toNodeId: recyclage.id, minLevel: 1, sourceHandle: 's-bottom', targetHandle: 't-top' },
      { fromNodeId: reduction.id, toNodeId: marchandeur.id, minLevel: 1, sourceHandle: 's-bottom', targetHandle: 't-top' },
      { fromNodeId: recyclage.id, toNodeId: apexCollection.id, minLevel: 1, sourceHandle: 's-bottom', targetHandle: 't-left' },
      { fromNodeId: marchandeur.id, toNodeId: apexCollection.id, minLevel: 1, sourceHandle: 's-bottom', targetHandle: 't-right' },
    ],
  })

  console.log('  Skill tree seedé : 3 branches, 14 nœuds, 12 connexions')
}
