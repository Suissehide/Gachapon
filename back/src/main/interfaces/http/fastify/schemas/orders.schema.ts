import { z } from 'zod/v4'

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
})

export const deliverOrderBodySchema = z.object({
  picks: z
    .array(
      z.object({
        lineIndex: z.number().int().min(0),
        userCardId: z.string().uuid(),
        amount: z.number().int().min(1),
      }),
    )
    .max(10),
})
