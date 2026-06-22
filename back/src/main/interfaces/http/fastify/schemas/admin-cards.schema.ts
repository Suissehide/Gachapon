import { z } from 'zod/v4'

export const cardRarityEnum = z.enum([
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
])

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
  baseHp: z.coerce.number().int().positive(),
  baseAtk: z.coerce.number().int().nonnegative(),
  baseDef: z.coerce.number().int().nonnegative(),
  baseSpd: z.coerce.number().int().nonnegative(),
  passiveKey: z.string().min(1).nullable().optional(),
})

export const adminCardUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  rarity: cardRarityEnum.optional(),
  dropWeight: z.number().positive().optional(),
  setId: z.string().uuid().optional(),
  imageUrl: z.string().url().nullable().optional(),
  baseHp: z.number().int().positive().optional(),
  baseAtk: z.number().int().nonnegative().optional(),
  baseDef: z.number().int().nonnegative().optional(),
  baseSpd: z.number().int().nonnegative().optional(),
  passiveKey: z.string().min(1).nullable().optional(),
})
