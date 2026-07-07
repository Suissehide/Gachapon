export type MilestonePack = {
  level: number
  bonusPoints: number
  tokens: number
  dust: number
}

export const SKILL_POINTS_PER_LEVEL = 1

export const MILESTONE_PACKS: MilestonePack[] = [
  { level: 10, bonusPoints: 2, tokens: 5, dust: 100 },
  { level: 25, bonusPoints: 2, tokens: 10, dust: 300 },
  { level: 50, bonusPoints: 2, tokens: 15, dust: 800 },
  { level: 75, bonusPoints: 2, tokens: 20, dust: 1500 },
  { level: 100, bonusPoints: 2, tokens: 30, dust: 3000 },
]

/** Paliers franchis en passant de oldLevel (exclu) à newLevel (inclus). */
export function milestonesCrossed(
  oldLevel: number,
  newLevel: number,
): MilestonePack[] {
  return MILESTONE_PACKS.filter(
    (m) => m.level > oldLevel && m.level <= newLevel,
  )
}

/** Points de compétence gagnés : 1 par niveau + bonus des paliers franchis. */
export function skillPointsGained(oldLevel: number, newLevel: number): number {
  if (newLevel <= oldLevel) {
    return 0
  }
  const bonus = milestonesCrossed(oldLevel, newLevel).reduce(
    (sum, m) => sum + m.bonusPoints,
    0,
  )
  return (newLevel - oldLevel) * SKILL_POINTS_PER_LEVEL + bonus
}
