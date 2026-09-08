import { z } from 'zod/v4'

import { enemySpecSchema } from '../../../../domain/combat/sim-units'
import { cardRaritySchema } from './admin-streak.schema'
import { towerElementSchema } from './tower.schema'

export const adminRaidBossParamSchema = z.object({
  element: towerElementSchema,
})

export const adminRaidBossPatchBodySchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    spec: enemySpecSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.spec !== undefined, {
    message: 'Rien à modifier',
    path: ['name'],
  })

export const adminRaidTierParamSchema = z.object({
  pct: z.coerce.number().int().min(1).max(100),
})

const nonNegative = z.number().int().min(0)

export const adminRaidTierPatchBodySchema = z.object({
  tokens: nonNegative.optional(),
  dust: nonNegative.optional(),
  gold: nonNegative.optional(),
  xp: nonNegative.optional(),
  cardRarity: cardRaritySchema.nullable().optional(),
})
