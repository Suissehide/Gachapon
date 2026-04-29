import { z } from 'zod'

export const dailyShopItemIdParamSchema = z.object({
  itemId: z.string().uuid(),
})
