import type { PrismaClient } from '../../src/generated/client'
import { QUEST_DEFINITIONS } from '../../src/main/domain/quests/quest-definitions'

/**
 * Crée toutes les quêtes sur une base fraîche. La liste elle-même vit dans
 * `src/main/domain/quests/quest-definitions.ts` : elle est partagée avec
 * `QuestsDomain.bootstrap()`, qui est le seul chemin capable d'ajouter une
 * quête à une base déjà peuplée (ce seed-ci part d'une base vidée).
 */
export async function seedQuests(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const quest of QUEST_DEFINITIONS) {
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

  console.log(`  ${QUEST_DEFINITIONS.length} quêtes créées`)
}
