import { apiUrl } from '../constants/config.constant.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type CardRarityKey =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'

/** Un des quatre bonus d'équipe. Le plafond est par bonus, pas global. */
export type TeamPerkConfig = {
  perRank: number
  unlockLevel: number
  maxRank: number
}

export type MilestonePackConfig = {
  level: number
  bonusPoints: number
  tokens: number
  dust: number
}

// Miroir de SUBSTAT_KEYS (back/src/main/domain/equipment/equipment-progression.ts) :
// une plage par clé, dérivée côté back — étendre ici en même temps que là-bas.
export type SubstatRangeKey =
  | 'hpFlat'
  | 'hpPct'
  | 'atkFlat'
  | 'atkPct'
  | 'defFlat'
  | 'defPct'
  | 'spdFlat'
  | 'spdPct'
  | 'critRatePct'
  | 'critDmgPct'
  | 'armorPenPct'
  | 'lifestealPct'

export interface EconomyConfig {
  xp: {
    base: number
    slope: number
    levelCap: number
    skillPointsPerLevel: number
    milestones: MilestonePackConfig[]
  }
  gacha: {
    pullTokenCost: number
    pityThreshold: number
    tokenRegenIntervalMinutes: number
    tokenMaxStock: number
  }
  recycle: Record<CardRarityKey, number>
  card: {
    goldCostBase: number
    goldCostExp: number
    dustCostBase: number
    dustCostExp: number
    rarityMult: Record<CardRarityKey, number>
    statGrowthPerLevel: number
    ascensionStatBonus: number
    maxPalier: number
  }
  combat: {
    pointsMax: number
    regenSeconds: number
    battleCost: number
    sweepCost: number
    elementAdvantageMult: number
    elementDisadvantageMult: number
    // Valeurs de base des 4 stats de stuff — affichées même sans équipement.
    baseCritRate: number
    baseCritDmg: number
    baseArmorPen: number
    baseLifesteal: number
  }
  wishlist: {
    priceMultiplier: number
    cooldownDays: number
  }
  // Nombre de tirages comptés par duelliste dans un duel de tirage. Lu ici
  // plutot que codé en dur dans la fenêtre de défi : la valeur vit dans
  // GlobalConfig et peut bouger sans redéploiement du front.
  duel: {
    pullCount: number
  }
  // Fenêtre de tirages et bornes de mise du pari sur un coéquipier — vit
  // dans GlobalConfig, lu ici plutôt que codé en dur dans la fenêtre de
  // pari, comme `duel.pullCount` ci-dessus.
  bet: {
    pullWindow: number
    minStake: number
    maxStake: number
  }
  // Effectif max, fenêtre « recrue » et arbre des quatre bonus d'équipe —
  // vit dans GlobalConfig (`team.*`/`teamPerk.*`), lu ici plutôt que codé
  // en dur, comme `duel`/`bet` ci-dessus.
  team: {
    maxMembers: number
    recruitDays: number
    perks: {
      loot: TeamPerkConfig
      raid: TeamPerkConfig
      xp: TeamPerkConfig
      forge: TeamPerkConfig
    }
  }
  equip: {
    goldCostBase: number
    goldCostExp: number
    levelScale: number
    maxLevel: number
    substatMilestone: number
    maxSubstats: number
    initialSubstatsByRarity: Record<CardRarityKey, number>
    salvageGold: Record<CardRarityKey, number>
    substatRanges: Record<SubstatRangeKey, { min: number; max: number }>
  }
}

export async function getEconomyConfig(): Promise<EconomyConfig> {
  const res = await fetchWithAuth(`${apiUrl}/economy/config`)
  if (!res.ok) {
    throw new Error('Failed to load economy config')
  }
  return res.json()
}
