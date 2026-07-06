import { z } from 'zod'

export const setWishBodySchema = z.object({
  cardId: z.string().uuid(),
})

const wishlistCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  rarity: z.string(),
  set: z.object({ id: z.string().uuid(), name: z.string() }),
})

export const wishlistStatusResponseSchema = z.object({
  card: wishlistCardSchema.nullable(),
  price: z.number().nullable(),
  availableAt: z.string().nullable(),
  cooldownDays: z.number(),
})

export const wishlistPurchaseResponseSchema = z.object({
  card: wishlistCardSchema,
  wasDuplicate: z.boolean(),
  dustSpent: z.number(),
  newDustBalance: z.number(),
  availableAt: z.string(),
})
