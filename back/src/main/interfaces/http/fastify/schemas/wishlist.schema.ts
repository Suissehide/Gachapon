import { z } from 'zod'

export const setWishBodySchema = z.object({
  cardId: z.string().uuid(),
})
