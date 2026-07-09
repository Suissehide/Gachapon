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
  // One-shot quests — chaîne d'onboarding : enseigne une boucle de jeu à la fois.
  // Les jalons de progression (X tirages, posséder une rareté) sont couverts par
  // les succès (achievements) ; les quêtes ne les doublonnent plus.
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
    key: 'first_battle',
    name: 'Baptême du Feu',
    description: 'Remporte ton premier combat en campagne.',
    criterion: { event: 'STAGE_CLEARED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 10,
    rewardDust: 50,
  },
  {
    key: 'first_card_level',
    name: 'Première Évolution',
    description: "Monte le niveau d'une carte pour la première fois.",
    criterion: { event: 'CARD_LEVELED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 10,
    rewardDust: 50,
  },
  {
    key: 'first_recycle',
    name: 'Premier Recyclage',
    description: 'Recycle ta première carte en poussière.',
    criterion: { event: 'CARD_RECYCLED', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 5,
    rewardDust: 50,
  },
  {
    key: 'first_gold_spent',
    name: 'Premier Achat',
    description: "Dépense de l'or pour la première fois.",
    criterion: { event: 'GOLD_SPENT', target: 1 },
    period: 'ONESHOT',
    rewardTokens: 5,
    rewardDust: 30,
  },
  {
    key: 'collect_10_unique',
    name: 'Collectionneur Débutant',
    description: 'Possède 10 cartes uniques dans ta collection.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 10,
      filter: { uniqueOnly: true },
    },
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
  // Weekly quests — 3 tirées au sort chaque semaine parmi ce pool.
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
    key: 'weekly_uniques_5',
    name: 'Nouvelles Trouvailles',
    description: 'Obtiens 5 nouvelles cartes uniques cette semaine.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 5,
      filter: { uniqueOnly: true },
    },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_rares_3',
    name: 'Éclat Hebdomadaire',
    description: 'Obtiens 3 cartes RARE cette semaine.',
    criterion: {
      event: 'PULL_COMPLETED',
      target: 3,
      filter: { rarity: 'RARE' },
    },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_battles_15',
    name: 'Combattant Acharné',
    description: 'Remporte 15 combats cette semaine.',
    criterion: { event: 'STAGE_CLEARED', target: 15 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_recycle_15',
    name: 'Alchimiste',
    description: 'Recycle 15 exemplaires de cartes cette semaine.',
    criterion: { event: 'CARD_RECYCLED', target: 15 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_card_levels_8',
    name: "Maître d'Évolution",
    description: 'Monte le niveau de 8 cartes cette semaine.',
    criterion: { event: 'CARD_LEVELED', target: 8 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
  {
    key: 'weekly_gold_spent_4000',
    name: 'Dépensier',
    description: 'Dépense 4 000 or cette semaine.',
    criterion: { event: 'GOLD_SPENT', target: 4000 },
    period: 'WEEKLY',
    rewardTokens: 5,
    rewardDust: 80,
    rewardXp: 150,
  },
]

export async function seedQuests(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const quest of QUESTS) {
    const { rewardTokens, rewardDust, rewardXp = 0, ...questData } = quest
    await tx.quest.create({
      data: {
        ...questData,
        reward: {
          create: { tokens: rewardTokens, dust: rewardDust, xp: rewardXp },
        },
      },
    })
  }

  console.log(`  ${QUESTS.length} quêtes créées`)
}
