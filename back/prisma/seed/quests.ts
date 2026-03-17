import type { PrismaClient } from '../../src/generated/client'

const QUESTS = [
  {
    key: 'first_pull',
    name: 'Premier Tirage',
    description: 'Effectue ton premier tirage au Gachapon.',
    criterion: { type: 'pull_count', target: 1 },
    rewardTokens: 5,
    rewardDust: 0,
  },
  {
    key: 'pull_10',
    name: 'Dix Tirages',
    description: 'Effectue 10 tirages au total.',
    criterion: { type: 'pull_count', target: 10 },
    rewardTokens: 10,
    rewardDust: 50,
  },
  {
    key: 'pull_100',
    name: 'Centurion',
    description: 'Effectue 100 tirages au total.',
    criterion: { type: 'pull_count', target: 100 },
    rewardTokens: 50,
    rewardDust: 500,
  },
  {
    key: 'collect_rare',
    name: 'Chasseur de Rares',
    description: 'Obtiens ta première carte RARE.',
    criterion: { type: 'rarity_obtained', rarity: 'RARE', target: 1 },
    rewardTokens: 15,
    rewardDust: 100,
  },
  {
    key: 'collect_legendary',
    name: 'Toucher l\'Absolu',
    description: 'Obtiens ta première carte LÉGENDAIRE.',
    criterion: { type: 'rarity_obtained', rarity: 'LEGENDARY', target: 1 },
    rewardTokens: 100,
    rewardDust: 1000,
  },
  {
    key: 'collect_10_unique',
    name: 'Collectionneur Débutant',
    description: 'Possède 10 cartes uniques dans ta collection.',
    criterion: { type: 'unique_cards', target: 10 },
    rewardTokens: 20,
    rewardDust: 200,
  },
  {
    key: 'join_team',
    name: 'Force du Groupe',
    description: 'Rejoins ou crée une équipe.',
    criterion: { type: 'team_member' },
    rewardTokens: 10,
    rewardDust: 50,
  },
] as const

export async function seedQuests(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  await tx.userQuest.deleteMany()
  await tx.quest.deleteMany()
  console.log('  Cleared UserQuest, Quest')

  for (const quest of QUESTS) {
    await tx.quest.create({ data: quest })
  }

  console.log(`  ${QUESTS.length} quêtes créées`)
}
