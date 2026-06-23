import { z } from 'zod'

export const cardDustConvertParamsSchema = z.object({
  userCardId: z.string().uuid(),
})

export const cardDustConvertBodySchema = z.object({
  amount: z.number().int().min(1),
})

export const cardDustConvertResponseSchema = z.object({
  dustEarned: z.number().int(),
  remainingQuantity: z.number().int(),
})

export const cardLevelUpParamsSchema = z.object({
  userCardId: z.string().uuid(),
})

export const cardLevelUpBodySchema = z.object({
  targetLevel: z.number().int().min(2).max(60),
})

export const cardLevelUpResponseSchema = z.object({
  newLevel: z.number().int(),
  goldSpent: z.number().int(),
  dustSpent: z.number().int(),
  newGold: z.number().int(),
  newDust: z.number().int(),
})

export const cardAscendParamsSchema = z.object({
  userCardId: z.string().uuid(),
})

export const cardAscendResponseSchema = z.object({
  newPalier: z.number().int(),
  doublonsSpent: z.number().int(),
  remainingQuantity: z.number().int(),
})
