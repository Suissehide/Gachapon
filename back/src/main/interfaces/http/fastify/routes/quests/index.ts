import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { WEEKLY_BONUS_REWARD } from '../../../../../domain/quests/quest-matching'

// ── Response schema ──────────────────────────────────────────────────────────

const questRewardSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  gold: z.number().int(),
})

const questClaimSchema = z.object({
  rewardId: z.string(),
  claimed: z.boolean(),
})

const questStateItemSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  progress: z.number().int(),
  target: z.number().int(),
  completed: z.boolean(),
  reward: questRewardSchema.nullable(),
  claim: questClaimSchema.nullable(),
})

const weeklyBonusSchema = z.object({
  completed: z.boolean(),
  reward: z.object({
    gold: z.number().int(),
    xp: z.number().int(),
  }),
  claim: questClaimSchema.nullable(),
})

const questsStateResponseSchema = z.object({
  weekly: z.array(questStateItemSchema),
  weeklyBonus: weeklyBonusSchema,
  oneshot: z.array(questStateItemSchema),
})

// ── Router ───────────────────────────────────────────────────────────────────

export const questsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { questsDomain } = fastify.iocContainer

  fastify.get(
    '/quests',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: questsStateResponseSchema } },
    },
    async (request) => {
      const state = await questsDomain.getStateForUser(request.user.userID)
      return {
        weekly: state.weekly,
        weeklyBonus: {
          completed: state.weeklyBonusCompleted,
          reward: WEEKLY_BONUS_REWARD,
          claim: state.weeklyBonusClaim,
        },
        oneshot: state.oneshot,
      }
    },
  )
}
