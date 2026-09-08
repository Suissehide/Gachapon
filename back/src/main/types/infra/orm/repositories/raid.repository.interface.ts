import type {
  CardElement,
  CardRarity,
  Prisma,
  RaidBoss,
  RaidTier,
  Reward,
  TeamRaid,
} from '../../../../../generated/client'

export type RaidTierWithReward = RaidTier & { reward: Reward }
export type TeamRaidWithBoss = TeamRaid & { boss: RaidBoss }

export type RaidContributionRow = {
  userId: string
  damage: number
  attacks: number
}

export type RaidTierRewardPatch = Partial<{
  tokens: number
  dust: number
  gold: number
  xp: number
  cardRarity: CardRarity | null
}>

export interface IRaidRepository {
  listBosses(): Promise<RaidBoss[]>
  findBossByElement(element: CardElement): Promise<RaidBoss | null>
  updateBoss(
    element: CardElement,
    data: { name?: string; spec?: Prisma.InputJsonValue },
  ): Promise<RaidBoss>
  /** Paliers triés par pct croissant. */
  listTiers(): Promise<RaidTierWithReward[]>
  findTierByPct(pct: number): Promise<RaidTierWithReward | null>
  updateTierReward(
    pct: number,
    data: RaidTierRewardPatch,
  ): Promise<RaidTierWithReward>
  findRaid(teamId: string, weekKey: string): Promise<TeamRaidWithBoss | null>
  /** Crée le raid de la semaine s'il n'existe pas ; renvoie l'existant sinon (deux premières visites simultanées). */
  upsertRaid(data: {
    teamId: string
    weekKey: string
    bossId: string
    maxHp: number
    memberCountAtStart: number
  }): Promise<TeamRaidWithBoss>
  /** Dégâts cumulés et nombre d'attaques par joueur, triés par dégâts décroissants. */
  listContributions(raidId: string): Promise<RaidContributionRow[]>
  /** Attaques du joueur depuis `since`, TOUS raids confondus (quota global). */
  countUserAttacksSince(userId: string, since: Date): Promise<number>
}
