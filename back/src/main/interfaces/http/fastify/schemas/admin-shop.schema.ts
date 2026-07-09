import { z } from 'zod/v4'

export const shopItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['TOKEN_PACK', 'BOOST', 'COSMETIC', 'MACHINE']),
  cost: z.number().int().min(0),
  currency: z.enum(['DUST', 'GOLD']).default('DUST'),
  value: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const adminShopItemIdParamSchema = z.object({ id: z.string().uuid() })

export const adminShopCreateBodySchema = shopItemSchema

export const adminShopUpdateBodySchema = shopItemSchema.partial()
