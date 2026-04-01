import { z } from 'zod/v4'

export const cardRarityEnum = z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])

export const adminCardsQuerySchema = z.object({
  setId: z.string().uuid().optional(),
  rarity: cardRarityEnum.optional(),
})

export const adminCardIdParamSchema = z.object({ id: z.string().uuid() })

export const adminCardFieldsSchema = z.object({
  name: z.string().min(1),
  setId: z.string().uuid(),
  rarity: cardRarityEnum,
  dropWeight: z.coerce.number().positive(),
})

export const adminCardUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  rarity: cardRarityEnum.optional(),
  dropWeight: z.number().positive().optional(),
  setId: z.string().uuid().optional(),
  imageUrl: z.string().url().nullable().optional(),
})
