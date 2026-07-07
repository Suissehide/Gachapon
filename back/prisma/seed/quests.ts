import type { PrismaClient } from '../../src/generated/client'

interface QuestConfig {
  key: string
  name: string
  description: string
  criterion: Record<string, unknown>
  period: 'ONESHOT' | 'WEEKLY'
  rewardTokens: number
  rewardDust: number
  rewardXp?: number
}

const QUESTS: QuestConfig[] = [
  // One-shot quests
  {
    key: 'first_pull',
    name: 'Premier Tirage',
    description: 'Effectue ton premier tirage au Gachapon.',
    criterion: { event: 'PULL_COMPLETED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 5,
    rewardDust: 0,
  },
  {
    key: 'pull_10',
    name: 'Dix Tirages',
    description: 'Effectue 10 tirages au total.',
    criterion: { event: 'PULL_COMPLETED', target: 10 },
    period: 'ONESHOT',
    rewardTokens: 10,
    rewardDust: 50,
  },
  {
    key: 'pull_100',
    name: 'Centurion',
    description: 'Effectue 100 tirages au total.',
    criterion: { event: 'PULL_COMPLETED', target: 100 },
    period: 'ONESHOT',
    rewardTokens: 50,
    rewardDust: 500,
  },
  {
    key: 'collect_rare',
    name: 'Chasseur de Rares',
    description: 'Obtiens ta première carte RARE.',
    criterion: { event: 'PULL_COMPLETED', target: 1, filter: { rarity: 'RARE' } },
    period: 'ONESHOT',
    rewardTokens: 15,
    rewardDust: 100,
  },
  {
    key: 'collect_legendary',
    name: 'Toucher l\'Absolu',
    description: 'Obtiens ta première carte LÉGENDAIRE.',
    criterion: { event: 'PULL_COMPLETED', target: 1, filter: { rarity: 'LEGENDARY' } },
    period: 'ONESHOT',
    rewardTokens: 100,
    rewardDust: 1000,
  },
  {
    key: 'collect_10_unique',
    name: 'Collectionneur Débutant',
    description: 'Possède 10 cartes uniques dans ta collection.',
    criterion: { event: 'PULL_COMPLETED', target: 10, filter: { uniqueOnly: true } },
    period: 'ONESHOT',
    rewardTokens: 20,
    rewardDust: 200,
  },
  {
    key: 'join_team',
    name: 'Force du Groupe',
    description: 'Rejoins ou crée une équipe.',
    criterion: { event: 'TEAM_JOINED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 10,
    rewardDust: 50,
  },
  // Weekly quests
  {
    key: 'weekly_pulls_30',
    name: 'Semaine Explosive',
    description: 'Effectue 30 tirages cette semaine.',
    criterion: { event: 'PULL_COMPLETED', target: 30 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_battles_25',
    name: 'Combattant Acharné',
    description: 'Remporte 25 combats cette semaine.',
    criterion: { event: 'BATTLE_WON', target: 25 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_recycle_20',
    name: 'Alchimiste',
    description: 'Recycle 20 cartes cette semaine.',
    criterion: { event: 'CARDS_RECYCLED', target: 20 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_card_levels_10',
    name: 'Maître d\'Évolution',
    description: 'Monte le niveau de 10 cartes cette semaine.',
    criterion: { event: 'CARD_LEVELED', target: 10 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_gold_spent_10000',
    name: 'Dépensier',
    description: 'Dépense 10 000 or cette semaine.',
    criterion: { event: 'GOLD_SPENT', target: 10000 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
] as const

export async function seedQuests(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {

  for (const quest of QUESTS) {
    const { rewardTokens, rewardDust, rewardXp = 0, ...questData } = quest
    await tx.quest.create({
      data: {
        ...questData,
        reward: { create: { tokens: rewardTokens, dust: rewardDust, xp: rewardXp } },
      },
    })
  }

  console.log(`  ${QUESTS.length} quêtes créées`)
}
