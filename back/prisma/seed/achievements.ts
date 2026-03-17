import type { PrismaClient } from '../../src/generated/client'

const ACHIEVEMENTS = [
  {
    key: 'welcome',
    name: 'Bienvenue !',
    description: 'Crée ton compte et rejoins le Gachapon.',
    rewardTokens: 20,
    rewardDust: 0,
  },
  {
    key: 'first_legendary',
    name: 'Élu des Dieux',
    description: 'Obtiens une carte LÉGENDAIRE pour la première fois.',
    rewardTokens: 50,
    rewardDust: 500,
  },
  {
    key: 'full_set',
    name: 'Collectionneur Parfait',
    description: 'Possède toutes les cartes du set Alpha Warriors.',
    rewardTokens: 200,
    rewardDust: 2000,
  },
  {
    key: 'holo_hunter',
    name: 'Chasseur d\'Holographiques',
    description: 'Obtiens une carte variante HOLOGRAPHIC.',
    rewardTokens: 75,
    rewardDust: 750,
  },
  {
    key: 'dust_rich',
    name: 'Maître de la Poussière',
    description: 'Accumule 10 000 dust.',
    rewardTokens: 30,
    rewardDust: 0,
  },
  {
    key: 'team_owner',
    name: 'Chef de Clan',
    description: 'Crée ta propre équipe.',
    rewardTokens: 15,
    rewardDust: 100,
  },
] as const

export async function seedAchievements(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  await tx.userAchievement.deleteMany()
  await tx.achievement.deleteMany()
  console.log('  Cleared UserAchievement, Achievement')

  for (const achievement of ACHIEVEMENTS) {
    await tx.achievement.create({ data: achievement })
  }

  console.log(`  ${ACHIEVEMENTS.length} succès créés`)
}
