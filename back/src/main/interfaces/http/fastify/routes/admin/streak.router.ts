import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { errorMessage } from '../../errors/messages'
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
      default: defaultMilestone
        ? {
            tokens: defaultMilestone.reward.tokens,
            dust: defaultMilestone.reward.dust,
            xp: defaultMilestone.reward.xp,
            cardRarity: defaultMilestone.reward.cardRarity,
          }
        : null,
      defaultMilestoneId: defaultMilestone?.id ?? null,
      milestones: milestones.map((m) => ({
        id: m.id,
        day: m.day,
        tokens: m.reward.tokens,
        dust: m.reward.dust,
        xp: m.reward.xp,
        cardRarity: m.reward.cardRarity,
      })),
    }
  })

  fastify.patch(
    '/default',
    { schema: { body: adminStreakDefaultBodySchema } },
    async (request) => {
      const defaultMilestone = await streakMilestoneRepository.findDefault()
      if (!defaultMilestone) {
        throw Boom.notFound(errorMessage('streak.defaultMilestoneNotFound'))
      }
      const updated = await rewardRepository.update(
        defaultMilestone.rewardId,
        request.body,
      )
      return {
        tokens: updated.tokens,
        dust: updated.dust,
        xp: updated.xp,
        cardRarity: updated.cardRarity,
      }
    },
  )

  fastify.post(
    '/milestones',
    { schema: { body: adminStreakCreateMilestoneBodySchema } },
    async (request, reply) => {
      const { day, tokens, dust, xp, cardRarity } = request.body

      const existing = await streakMilestoneRepository.findByDay(day)
      if (existing) {
        throw Boom.conflict(
          errorMessage('streak.milestoneAlreadyExistsForDay', { day }),
        )
      }

      const reward = await rewardRepository.create({
        tokens,
        dust,
        xp,
        cardRarity,
      })
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
        cardRarity: milestone.reward.cardRarity,
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
        throw Boom.notFound(errorMessage('streak.milestoneNotFound'))
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
        cardRarity: updated.cardRarity,
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
        throw Boom.notFound(errorMessage('streak.milestoneNotFound'))
      }
      if (milestone.day === 0) {
        throw Boom.forbidden(
          errorMessage('streak.cannotDeleteDefaultMilestone'),
        )
      }

      await streakMilestoneRepository.update(request.params.id, {
        isActive: false,
      })
      return reply.status(204).send()
    },
  )
}
