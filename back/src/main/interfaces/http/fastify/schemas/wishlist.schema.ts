import { z } from 'zod'

import { cardElementEnum } from './admin-cards.schema'

export const wishlistCardParamsSchema = z.object({
  cardId: z.string().uuid(),
})

const wishlistCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  rarity: z.string(),
  element: cardElementEnum.nullable(),
  set: z.object({ id: z.string().uuid(), name: z.string() }),
  price: z.number(),
})

export const wishlistStatusResponseSchema = z.object({
  slots: z.number(),
  cards: z.array(wishlistCardSchema),
})

export const wishlistPurchaseResponseSchema = z.object({
  card: wishlistCardSchema,
  wasDuplicate: z.boolean(),
  dustSpent: z.number(),
  newDustBalance: z.number(),
})
