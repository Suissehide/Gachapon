import type { PrismaClient } from '../../src/generated/client'

const CONFIG: Record<string, string> = {
  pull_token_cost: '1',
  daily_free_tokens: '3',
  recycle_dust_common: '5',
  recycle_dust_uncommon: '15',
  recycle_dust_rare: '50',
  recycle_dust_epic: '150',
  recycle_dust_legendary: '500',

  // Combat — stamina (PC). Cap intentionally low; a Phase 2 skill node
  // (COMBAT_PC_MAX) will let players invest skill points to raise it.
  'combat.pointsMax': '20',
  'combat.regenSeconds': '360',
  'combat.battleCost': '6',
  'combat.sweepCost': '6',
  'combat.timeoutTurns': '30',
  'combat.teamSize': '3',

  // Card leveling
  'card.levelUp.goldCurve.base': '5',
  'card.levelUp.goldCurve.exp': '1.6',
  'card.levelUp.dustCurve.base': '8',
  'card.levelUp.dustCurve.exp': '1.4',
  'card.levelUp.rarityMult.COMMON': '1.0',
  'card.levelUp.rarityMult.UNCOMMON': '1.3',
  'card.levelUp.rarityMult.RARE': '1.7',
  'card.levelUp.rarityMult.EPIC': '2.3',
  'card.levelUp.rarityMult.LEGENDARY': '3.0',

  // Card ascension
  'card.ascend.doublonsPerPalier': '1',
  'card.statGrowthPerLevel': '0.06',
  'card.ascensionStatBonus': '0.15',
}

export async function seedGlobalConfig(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {

  for (const [key, value] of Object.entries(CONFIG)) {
    await tx.globalConfig.create({ data: { key, value } })
  }

  console.log(`  ${Object.keys(CONFIG).length} clés de configuration créées`)
}
