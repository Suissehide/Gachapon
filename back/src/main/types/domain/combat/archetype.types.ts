/**
 * Archétypes de carte, ceux du classeur de production (colonne « Archétype »).
 * Chaque archétype détermine l'ultime de la carte (domain/combat/ultimates.ts).
 */
export const CARD_ARCHETYPES = [
  'TANK',
  'SUPPORT',
  'FIGHTER',
  'BALANCED',
  'RANGER',
  'ASSASSIN',
  'MAGE',
] as const
export type CardArchetype = (typeof CARD_ARCHETYPES)[number]
