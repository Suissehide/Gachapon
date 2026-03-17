import type { PrismaClient } from '../../src/generated/client'

const CONFIG: Record<string, string> = {
  pull_token_cost: '1',
  daily_free_tokens: '3',
  recycle_dust_common: '5',
  recycle_dust_uncommon: '15',
  recycle_dust_rare: '50',
  recycle_dust_epic: '150',
  recycle_dust_legendary: '500',
}

export async function seedGlobalConfig(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {

  for (const [key, value] of Object.entries(CONFIG)) {
    await tx.globalConfig.create({ data: { key, value } })
  }

  console.log(`  ${Object.keys(CONFIG).length} clés de configuration créées`)
}
