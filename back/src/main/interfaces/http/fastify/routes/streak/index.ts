import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const dayEntrySchema = z.object({
  day: z.number().int(),
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  isMilestone: z.boolean(),
  status: z.enum(['past', 'current', 'future']),
})

const summarySchema = z.object({
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
  default: z.object({ tokens: z.number().int(), dust: z.number().int(), xp: z.number().int() }),
  days: z.array(dayEntrySchema),
})

export const streakRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/summary',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: summarySchema } },
    },
    async (request) => {
      const { postgresOrm, streakMilestoneRepository } = fastify.iocContainer
      const userId = request.user.userID

      const user = await postgresOrm.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { streakDays: true, bestStreak: true },
      })

      const [defaultMilestone, activeMilestones] = await Promise.all([
        streakMilestoneRepository.findDefault(),
        streakMilestoneRepository.findAllActive(),
      ])

      const defaultReward = defaultMilestone?.reward ?? { tokens: 0, dust: 0, xp: 0 }

      // Build milestone lookup: day → reward
      const milestoneMap = new Map(
        activeMilestones.map((m) => [m.day, m.reward]),
      )

      const { streakDays } = user
      const days = Array.from({ length: 30 }, (_, i) => {
        const day = i + 1
        const isMilestone = milestoneMap.has(day)
        const reward = milestoneMap.get(day) ?? defaultReward

        let status: 'past' | 'current' | 'future'
        if (streakDays === 0 || day > streakDays) {
          status = 'future'
        } else if (day === streakDays) {
          status = 'current'
        } else {
          status = 'past'
        }

        return {
          day,
          tokens: reward.tokens,
          dust: reward.dust,
          xp: reward.xp,
          isMilestone,
          status,
        }
      })

      return {
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
        default: { tokens: defaultReward.tokens, dust: defaultReward.dust, xp: defaultReward.xp },
        days,
      }
    },
  )
}
