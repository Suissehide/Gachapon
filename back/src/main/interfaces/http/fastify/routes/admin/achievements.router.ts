import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { listCustomHandlerKeys } from '../../../../../domain/achievements/custom-handlers/index'
import {
  adminAchievementCreateBodySchema,
  adminAchievementIdParamSchema,
  adminAchievementUpdateBodySchema,
} from '../../schemas/admin-achievements.schema'

export const adminAchievementsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { achievementRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const achievements = await achievementRepository.findAll()
    return { achievements }
  })

  fastify.post(
    '/',
    { schema: { body: adminAchievementCreateBodySchema } },
    async (request, reply) => {
      const achievement = await achievementRepository.create(request.body)
      return reply.status(201).send(achievement)
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        params: adminAchievementIdParamSchema,
        body: adminAchievementUpdateBodySchema,
      },
    },
    async (request) => {
      const achievement = await achievementRepository.findById(
        request.params.id,
      )
      if (!achievement) {
        throw Boom.notFound('Achievement not found')
      }
      return achievementRepository.update(request.params.id, request.body)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminAchievementIdParamSchema } },
    async (request, reply) => {
      const achievement = await achievementRepository.findById(
        request.params.id,
      )
      if (!achievement) {
        throw Boom.notFound('Achievement not found')
      }
      await achievementRepository.delete(request.params.id)
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/custom-handlers',
    { schema: { response: { 200: z.array(z.string()) } } },
    () => listCustomHandlerKeys(),
  )
}
