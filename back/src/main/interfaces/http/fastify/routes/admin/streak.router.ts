import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  adminStreakCreateMilestoneBodySchema,
  adminStreakDefaultBodySchema,
  adminStreakMilestoneParamSchema,
  adminStreakUpdateMilestoneBodySchema,
} from '../../schemas/admin-streak.schema'

export const adminStreakRouter: FastifyPluginCallbackZod = (fastify) => {
  const { streakMilestoneRepository, rewardRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const [defaultMilestone, milestones] = await Promise.all([
      streakMilestoneRepository.findDefault(),
      streakMilestoneRepository.findAllActive(),
    ])
    return {
      default: defaultMilestone?.reward ?? null,
      defaultMilestoneId: defaultMilestone?.id ?? null,
      milestones: milestones.map((m) => ({
        id: m.id,
        day: m.day,
        tokens: m.reward.tokens,
        dust: m.reward.dust,
        xp: m.reward.xp,
      })),
    }
  })

  fastify.patch(
    '/default',
    { schema: { body: adminStreakDefaultBodySchema } },
    async (request) => {
      const defaultMilestone = await streakMilestoneRepository.findDefault()
      if (!defaultMilestone) {
        throw Boom.notFound(
          'Default streak milestone not found. Run the migration first.',
        )
      }
      const updated = await rewardRepository.update(
        defaultMilestone.rewardId,
        request.body,
      )
      return { tokens: updated.tokens, dust: updated.dust, xp: updated.xp }
    },
  )

  fastify.post(
    '/milestones',
    { schema: { body: adminStreakCreateMilestoneBodySchema } },
    async (request, reply) => {
      const { day, tokens, dust, xp } = request.body

      const existing = await streakMilestoneRepository.findByDay(day)
      if (existing) {
        throw Boom.conflict(`A milestone for day ${day} already exists.`)
      }

      const reward = await rewardRepository.create({ tokens, dust, xp })
      const milestone = await streakMilestoneRepository.create({
        day,
        isMilestone: true,
        isActive: true,
        rewardId: reward.id,
      })

      return reply.status(201).send({
        id: milestone.id,
        day: milestone.day,
        tokens: milestone.reward.tokens,
        dust: milestone.reward.dust,
        xp: milestone.reward.xp,
      })
    },
  )

  fastify.patch(
    '/milestones/:id',
    {
      schema: {
        params: adminStreakMilestoneParamSchema,
        body: adminStreakUpdateMilestoneBodySchema,
      },
    },
    async (request) => {
      const milestone = await streakMilestoneRepository.findByIdWithReward(
        request.params.id,
      )
      if (!milestone) {
        throw Boom.notFound('Milestone not found')
      }

      const updated = await rewardRepository.update(
        milestone.rewardId,
        request.body,
      )
      return {
        id: milestone.id,
        day: milestone.day,
        tokens: updated.tokens,
        dust: updated.dust,
        xp: updated.xp,
      }
    },
  )

  fastify.delete(
    '/milestones/:id',
    { schema: { params: adminStreakMilestoneParamSchema } },
    async (request, reply) => {
      const milestone = await streakMilestoneRepository.findByIdWithReward(
        request.params.id,
      )
      if (!milestone) {
        throw Boom.notFound('Milestone not found')
      }
      if (milestone.day === 0) {
        throw Boom.forbidden('Cannot delete the default daily milestone.')
      }

      await streakMilestoneRepository.update(request.params.id, {
        isActive: false,
      })
      return reply.status(204).send()
    },
  )
}
