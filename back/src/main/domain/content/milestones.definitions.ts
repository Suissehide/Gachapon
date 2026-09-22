/**
 * Jalons de série (streak) — 1 récompense par défaut + 4 jalons.
 *
 * Aucun texte : ces entrées ne portent que des récompenses. Elles vivent tout
 * de même sous `src/main/` pour que `prisma/seed/` ne contienne plus que de
 * l'écriture en base.
 */

export const STREAK_MILESTONES = [
  { day: 0, tokens: 2, dust: 5, xp: 25, isMilestone: false },
  { day: 3, tokens: 5, dust: 20, xp: 50, isMilestone: true },
  { day: 7, tokens: 8, dust: 50, xp: 100, isMilestone: true },
  { day: 14, tokens: 12, dust: 120, xp: 200, isMilestone: true },
  { day: 30, tokens: 20, dust: 300, xp: 400, isMilestone: true },
]
