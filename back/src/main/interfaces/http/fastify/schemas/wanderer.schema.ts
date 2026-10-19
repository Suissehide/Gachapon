import { z } from 'zod/v4'

import { battleResponseSchema, cardDropSchema } from './campaign.schema'

export const wandererViewSchema = z.object({
  stageId: z.string(),
  chapter: z.number().int(),
  index: z.number().int(),
  stageLabel: z.string(),
  expiresAt: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  element: z.string().nullable(),
  recommendedPower: z.number(),
})

export const wandererResponseSchema = z.object({
  wanderer: wandererViewSchema.nullable(),
})

export const wandererLootSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['GOLD', 'DUST', 'TOKENS']),
    amount: z.number().int(),
  }),
  z.object({
    kind: z.literal('CARD'),
    amount: z.literal(1),
    card: cardDropSchema,
  }),
])

export const wandererBattleResponseSchema = battleResponseSchema
  .omit({ rewards: true })
  .extend({ loot: wandererLootSchema.nullable() })
