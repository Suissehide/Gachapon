export type MilestonePack = {
  level: number
  bonusPoints: number
  tokens: number
  dust: number
}

export type XpCfgWithMilestones = {
  skillPointsPerLevel: number
  milestones: MilestonePack[]
}

export type LevelUpReward = {
  skillPoints: number
  milestones: MilestonePack[]
}

/**
 * Calcule la récompense de montée de niveau — miroir pur du back level-rewards.ts.
 * skillPoints = (newLevel - oldLevel) * skillPointsPerLevel
 *             + Σ bonusPoints des paliers franchis (oldLevel, newLevel]
 * milestones  = paliers franchis dans l'intervalle (oldLevel, newLevel]
 */
export function levelUpReward(
  oldLevel: number,
  newLevel: number,
  xpCfg: XpCfgWithMilestones,
): LevelUpReward {
  if (newLevel <= oldLevel) {
    return { skillPoints: 0, milestones: [] }
  }
  const milestones = xpCfg.milestones.filter(
    (m) => m.level > oldLevel && m.level <= newLevel,
  )
  const bonusPoints = milestones.reduce((sum, m) => sum + m.bonusPoints, 0)
  const skillPoints = (newLevel - oldLevel) * xpCfg.skillPointsPerLevel + bonusPoints
  return { skillPoints, milestones }
}
