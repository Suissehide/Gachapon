import { z } from 'zod/v4'

export const collectionCardsQuerySchema = z.object({
  setId: z.string().optional(),
  rarity: z.string().optional(),
})

export const collectionCardIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionUserIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionRecycleBodySchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  variant: z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC']).default('NORMAL'),
})
