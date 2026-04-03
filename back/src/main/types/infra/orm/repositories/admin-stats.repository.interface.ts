export type DashboardData = {
  kpis: {
    totalUsers: number
    pullsToday: number
    dustGenerated: number
    legendaryCount: number
  }
  pullsSeries: { day: string; count: number }[]
}

export type RarityDriftEntry = {
  rarity: string
  realCount: number
  realPct: number
  theoreticalPct: number
}

export type NeverPulledCard = {
  id: string
  name: string
  rarity: string
  setName: string
}

export type SkillDistributionEntry = {
  nodeId: string
  level: number
  count: number
}

export type DetailedStats = {
  rarityDrift: RarityDriftEntry[]
  neverPulledCards: NeverPulledCard[]
  activeUsers: { sevenDays: number; thirtyDays: number }
  skillDistribution: SkillDistributionEntry[]
}

export interface IAdminStatsRepository {
  getDashboard(): Promise<DashboardData>
  getDetailedStats(): Promise<DetailedStats>
}
