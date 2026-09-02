import { z } from 'zod/v4'

export const combatTeamPutBodySchema = z.object({
  userCardIds: z.array(z.string().uuid()).min(1).max(3),
})

export const combatPointsResponseSchema = z.object({
  combatPoints: z.number().int(),
  maxStock: z.number().int(),
  regenSeconds: z.number().int(),
  battleCost: z.number().int(),
  sweepCost: z.number().int(),
  nextCombatPointAt: z.date().nullable(),
})

export const teamUnitSchema = z.object({
  userCardId: z.string(),
  cardId: z.string(),
  cardName: z.string(),
  cardImageUrl: z.string().nullable(),
  element: z.string().nullable(),
  rarity: z.string(),
  variant: z.string(),
  level: z.number().int(),
  palier: z.number().int(),
  passiveKey: z.string().nullable(),
  passiveLabel: z.string().nullable(),
  stats: z.object({
    hp: z.number().int(),
    atk: z.number().int(),
    def: z.number().int(),
    spd: z.number().int(),
  }),
})

export const combatTeamResponseSchema = z.object({
  team: z.array(teamUnitSchema),
})

const attackPatternEnum = z.enum([
  'BASIC',
  'AOE_3',
  'MULTI_2',
  'MONO_AMPLIFIED',
  'MONO_DOUBLE',
])

const simulatorUnitSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  hp: z.number().int().positive(),
  atk: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(),
  spd: z.number().int().nonnegative(),
  attackPattern: attackPatternEnum,
  passiveKey: z.string().nullable(),
  element: z.string().nullable().optional(),
  palier: z.number().int().min(1).max(6),
  // Défaut 100 : préserve la compatibilité des charges utiles existantes de
  // cette route de debug admin, où mitigationRef n'était pas encore envoyé.
  mitigationRef: z.number().positive().default(100),
  // Défauts alignés sur DEFAULTS (config.service.ts) : préservent la
  // compatibilité des charges utiles existantes de cette route de debug
  // admin, où ces 4 stats n'étaient pas encore envoyées.
  critRate: z.number().nonnegative().max(100).default(5),
  critDmg: z.number().nonnegative().default(150),
  armorPen: z.number().nonnegative().default(0),
  lifesteal: z.number().nonnegative().default(0),
})

export const combatDebugBattleBodySchema = z.object({
  teamA: z.array(simulatorUnitSchema).min(1).max(3),
  teamB: z.array(simulatorUnitSchema).min(1).max(3),
  seed: z.string().min(1).max(64),
  timeoutTurns: z.number().int().min(1).max(100).optional(),
  elementAdvantageMult: z.number().positive().optional(),
  elementDisadvantageMult: z.number().positive().optional(),
})

export const combatDebugBattleResponseSchema = z.object({
  won: z.enum(['A', 'B']).nullable(),
  // LogEntry is a discriminated union — keep loose at the schema layer
  log: z.array(z.unknown()),
  turns: z.number().int(),
})
