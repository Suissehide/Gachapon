import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  adminQuestCreateBodySchema,
  adminQuestIdParamSchema,
  adminQuestUpdateBodySchema,
} from '../../schemas/admin-quests.schema'

export const adminQuestsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { questRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const quests = await questRepository.findAll()
    return { quests }
  })

  fastify.post(
    '/',
    { schema: { body: adminQuestCreateBodySchema } },
    async (request, reply) => {
      const quest = await questRepository.create(request.body)
      return reply.status(201).send(quest)
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        params: adminQuestIdParamSchema,
        body: adminQuestUpdateBodySchema,
      },
    },
    async (request) => {
      const quest = await questRepository.findById(request.params.id)
      if (!quest) {
        throw Boom.notFound('Quest not found')
      }
      return questRepository.update(request.params.id, request.body)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminQuestIdParamSchema } },
    async (request, reply) => {
      const quest = await questRepository.findById(request.params.id)
      if (!quest) {
        throw Boom.notFound('Quest not found')
      }
      await questRepository.delete(request.params.id)
      return reply.status(204).send()
    },
  )
}
