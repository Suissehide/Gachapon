import { z } from 'zod/v4'

export const shopItemSchema = z.object({
  nameFr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionFr: z.string().min(1),
  descriptionEn: z.string().min(1),
  type: z.enum(['TOKEN_PACK', 'ENERGY_PACK', 'BOOST', 'COSMETIC', 'MACHINE']),
  cost: z.number().int().min(0),
  currency: z.enum(['DUST', 'GOLD']).default('DUST'),
  value: z.record(z.string(), z.json()),
  isActive: z.boolean().default(true),
})

export const adminShopItemIdParamSchema = z.object({ id: z.string().uuid() })

export const adminShopCreateBodySchema = shopItemSchema

export const adminShopUpdateBodySchema = shopItemSchema.partial()
