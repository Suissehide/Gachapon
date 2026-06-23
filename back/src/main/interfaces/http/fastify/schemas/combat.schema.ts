import { z } from 'zod/v4'

export const combatTeamPutBodySchema = z.object({
  userCardIds: z.array(z.string().uuid()).min(1).max(3),
})

export const teamUnitSchema = z.object({
  userCardId: z.string(),
  cardId: z.string(),
  cardName: z.string(),
  cardImageUrl: z.string().nullable(),
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
  palier: z.number().int().min(1).max(6),
})

export const combatDebugBattleBodySchema = z.object({
  teamA: z.array(simulatorUnitSchema).min(1).max(3),
  teamB: z.array(simulatorUnitSchema).min(1).max(3),
  seed: z.string().min(1).max(64),
  timeoutTurns: z.number().int().min(1).max(100).optional(),
})

export const combatDebugBattleResponseSchema = z.object({
  won: z.enum(['A', 'B']).nullable(),
  // LogEntry is a discriminated union — keep loose at the schema layer
  log: z.array(z.unknown()),
  turns: z.number().int(),
})
