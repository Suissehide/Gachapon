import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  adminSetCreateBodySchema,
  adminSetIdParamSchema,
  adminSetUpdateBodySchema,
} from '../../schemas/admin-sets.schema'

export const adminSetsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { cardRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const sets = await cardRepository.findAllSetsWithCount()
    return { sets }
  })

  fastify.post(
    '/',
    { schema: { body: adminSetCreateBodySchema } },
    async (request, reply) => {
      const set = await cardRepository.createSet(request.body)
      return reply.status(201).send(set)
    },
  )

  fastify.patch(
    '/:id',
    { schema: { params: adminSetIdParamSchema, body: adminSetUpdateBodySchema } },
    async (request) => {
      const set = await cardRepository.findSetById(request.params.id)
      if (!set) throw Boom.notFound('Set not found')
      return cardRepository.updateSet(request.params.id, request.body)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminSetIdParamSchema } },
    async (request, reply) => {
      const set = await cardRepository.findSetById(request.params.id)
      if (!set) throw Boom.notFound('Set not found')
      await cardRepository.deleteSet(request.params.id)
      return reply.status(204).send()
    },
  )
}
