import { z } from 'zod/v4'

import { CardRarity } from '../../../../../generated/client'

export const cardRaritySchema = z.enum(
  Object.values(CardRarity) as [CardRarity, ...CardRarity[]],
)

// Field-level schemas — composed below for create / patch / response shapes.
const tokensField = z.number().int().min(0)
const dustField = z.number().int().min(0)
const xpField = z.number().int().min(0)
// null is an explicit "no card reward" — distinct from undefined (PATCH no-op).
const cardRarityField = cardRaritySchema.nullable()

export const adminStreakDefaultBodySchema = z.object({
  tokens: tokensField.optional(),
  dust: dustField.optional(),
  xp: xpField.optional(),
  cardRarity: cardRarityField.optional(),
})

export const adminStreakCreateMilestoneBodySchema = z
  .object({
    day: z.number().int().min(1),
    tokens: tokensField.default(0),
    dust: dustField.default(0),
    xp: xpField.default(0),
    cardRarity: cardRarityField.default(null),
  })
  // A milestone must grant at least one reward (otherwise it's a no-op).
  .refine(
    (data) =>
      data.tokens > 0 ||
      data.dust > 0 ||
      data.xp > 0 ||
      data.cardRarity !== null,
    {
      message:
        'A milestone must grant at least one reward (tokens, dust, xp, or a card).',
      path: ['tokens'],
    },
  )

export const adminStreakMilestoneParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminStreakUpdateMilestoneBodySchema = z.object({
  tokens: tokensField.optional(),
  dust: dustField.optional(),
  xp: xpField.optional(),
  cardRarity: cardRarityField.optional(),
})
