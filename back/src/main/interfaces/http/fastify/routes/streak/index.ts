import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { CardRarity } from '../../../../../../generated/client'

const cardRaritySchema = z.enum(
  Object.values(CardRarity) as [CardRarity, ...CardRarity[]],
)

const rewardSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  cardRarity: cardRaritySchema.nullable(),
})

const dayEntrySchema = rewardSchema.extend({
  day: z.number().int(),
  isMilestone: z.boolean(),
  status: z.enum(['past', 'current', 'future']),
})

const summarySchema = z.object({
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
  default: rewardSchema,
  days: z.array(dayEntrySchema),
  // The next milestone the user will reach in their current 30-day cycle.
  // null if no upcoming milestone exists. Used by the UI to render a "Final" preview card.
  nextMilestone: dayEntrySchema.nullable(),
})

export const streakRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/summary',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: summarySchema } },
    },
    async (request) => {
      const { userRepository, streakMilestoneRepository } = fastify.iocContainer
      const userId = request.user.userID

      const user = await userRepository.findById(userId)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const [defaultMilestone, activeMilestones] = await Promise.all([
        streakMilestoneRepository.findDefault(),
        streakMilestoneRepository.findAllActive(),
      ])

      const defaultReward = defaultMilestone
        ? {
            tokens: defaultMilestone.reward.tokens,
            dust: defaultMilestone.reward.dust,
            xp: defaultMilestone.reward.xp,
            cardRarity: defaultMilestone.reward.cardRarity,
          }
        : { tokens: 0, dust: 0, xp: 0, cardRarity: null }

      // Build milestone lookup: day → reward (already filtered to active, day > 0).
      const milestoneMap = new Map(
        activeMilestones.map((m) => [
          m.day,
          {
            tokens: m.reward.tokens,
            dust: m.reward.dust,
            xp: m.reward.xp,
            cardRarity: m.reward.cardRarity,
          },
        ]),
      )

      const { streakDays } = user
      // Rewards cycle every 30 days — map absolute streak to position within current cycle.
      const cycleDay = streakDays === 0 ? 0 : ((streakDays - 1) % 30) + 1

      const buildDay = (day: number) => {
        const isMilestone = milestoneMap.has(day)
        const reward = milestoneMap.get(day) ?? defaultReward

        let status: 'past' | 'current' | 'future'
        if (cycleDay === 0 || day > cycleDay) {
          status = 'future'
        } else if (day === cycleDay) {
          status = 'current'
        } else {
          status = 'past'
        }

        return {
          day,
          tokens: reward.tokens,
          dust: reward.dust,
          xp: reward.xp,
          cardRarity: reward.cardRarity,
          isMilestone,
          status,
        }
      }

      const days = Array.from({ length: 30 }, (_, i) => buildDay(i + 1))

      // Pick the next milestone day strictly after the current cycle day.
      // Fallback: the latest milestone in the cycle (so the "Final" card always shows something).
      const upcomingMilestone =
        activeMilestones.find((m) => m.day > cycleDay) ??
        activeMilestones[activeMilestones.length - 1] ??
        null
      const nextMilestone = upcomingMilestone
        ? buildDay(upcomingMilestone.day)
        : null

      return {
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
        default: defaultReward,
        days,
        nextMilestone,
      }
    },
  )
}
