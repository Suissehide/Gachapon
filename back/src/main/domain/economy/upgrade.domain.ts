export type UserUpgradeEffects = {
  regenReductionMinutes: number
  luckMultiplier: number
  dustHarvestMultiplier: number
  tokenVaultBonus: number
}

type UpgradeRow = {
  type: string
  level: number
  effect: number
  dustCost: number
}

const NEUTRAL_EFFECTS: UserUpgradeEffects = {
  regenReductionMinutes: 0,
  luckMultiplier: 1.0,
  dustHarvestMultiplier: 1.0,
  tokenVaultBonus: 0,
}

export function getUpgradeEffectsFromRows(rows: UpgradeRow[]): UserUpgradeEffects {
  const result = { ...NEUTRAL_EFFECTS }
  for (const row of rows) {
    switch (row.type) {
      case 'REGEN':
        result.regenReductionMinutes = row.effect
        break
      case 'LUCK':
        result.luckMultiplier = row.effect
        break
      case 'DUST_HARVEST':
        result.dustHarvestMultiplier = row.effect
        break
      case 'TOKEN_VAULT':
        result.tokenVaultBonus = row.effect
        break
    }
  }
  return result
}

/**
 * Fetches upgrade effects for a user from the DB.
 * Missing UserUpgrade rows = level 0 = neutral defaults.
 */
export async function getUserUpgradeEffects(
  userId: string,
  prisma: {
    userUpgrade: { findMany: Function }
    upgradeConfig: { findMany: Function }
  },
): Promise<UserUpgradeEffects> {
  const userUpgrades = await prisma.userUpgrade.findMany({
    where: { userId },
  })

  if (userUpgrades.length === 0) {
    return { ...NEUTRAL_EFFECTS }
  }

  const configs = await prisma.upgradeConfig.findMany({
    where: {
      OR: userUpgrades.map((u: { type: string; level: number }) => ({
        type: u.type,
        level: u.level,
      })),
    },
  })

  return getUpgradeEffectsFromRows(configs)
}
