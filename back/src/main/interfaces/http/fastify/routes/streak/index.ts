import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { streakSummaryResponseSchema } from '../../schemas/streak.schemas'

export const streakRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/summary',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: streakSummaryResponseSchema } },
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
