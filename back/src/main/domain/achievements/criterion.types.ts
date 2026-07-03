import { z } from 'zod'

import { CardRarity, CardVariant } from '../../../generated/enums'

const RaritySchema = z.nativeEnum(CardRarity)
const VariantSchema = z.nativeEnum(CardVariant)

export const AchievementCriterionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PULL_COUNT'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('DUST_SPENT'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('TOKENS_SPENT'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('CARDS_RECYCLED'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('REWARDS_CLAIMED'),
    threshold: z.number().int().positive(),
  }),
  z
    .object({
      type: z.literal('OWN_RARITY_COUNT'),
      rarity: RaritySchema.optional(),
      variant: VariantSchema.optional(),
      threshold: z.number().int().positive(),
    })
    .refine((c) => c.rarity !== undefined || c.variant !== undefined, {
      message: 'rarity ou variant requis (au moins un)',
    }),
  z.object({
    type: z.literal('COLLECTION_COMPLETE'),
    scope: z.union([z.literal('ALL'), z.object({ rarity: RaritySchema })]),
  }),
  z.object({
    type: z.literal('LEVEL_REACHED'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('STREAK_REACHED'),
    threshold: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('MACHINES_OWNED'),
    threshold: z.number().int().positive(),
  }),
  z.object({ type: z.literal('CUSTOM_EVENT'), handlerKey: z.string().min(1) }),
])

export type AchievementCriterion = z.infer<typeof AchievementCriterionSchema>
