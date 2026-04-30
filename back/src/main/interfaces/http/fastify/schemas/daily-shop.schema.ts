import { z } from 'zod/v4'

export const dailyShopItemIdParamSchema = z.object({
  itemId: z.string().uuid(),
})
