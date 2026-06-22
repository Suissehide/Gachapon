import { z } from 'zod'

export const cardDustConvertParamsSchema = z.object({
  userCardId: z.string().uuid(),
})

export const cardDustConvertBodySchema = z.object({
  amount: z.number().int().min(1),
})

export const cardDustConvertResponseSchema = z.object({
  dustEarned: z.number().int(),
  remainingQuantity: z.number().int(),
})
