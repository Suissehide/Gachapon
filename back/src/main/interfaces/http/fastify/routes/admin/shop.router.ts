import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { errorMessage } from '../../errors/messages'
import {
  adminShopCreateBodySchema,
  adminShopItemIdParamSchema,
  adminShopUpdateBodySchema,
} from '../../schemas/admin-shop.schema'

export const adminShopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { shopItemRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    const items = await shopItemRepository.findAll()
    return { items }
  })

  fastify.post(
    '/',
    { schema: { body: adminShopCreateBodySchema } },
    async (request, reply) => {
      const item = await shopItemRepository.create(request.body)
      return reply.status(201).send(item)
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        params: adminShopItemIdParamSchema,
        body: adminShopUpdateBodySchema,
      },
    },
    async (request) => {
      const item = await shopItemRepository.findById(request.params.id)
      if (!item) {
        throw Boom.notFound(errorMessage('shop.shopItemNotFound'))
      }
      return shopItemRepository.update(request.params.id, request.body)
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: adminShopItemIdParamSchema } },
    async (request, reply) => {
      const item = await shopItemRepository.findById(request.params.id)
      if (!item) {
        throw Boom.notFound(errorMessage('shop.shopItemNotFound'))
      }
      await shopItemRepository.delete(request.params.id)
      return reply.status(204).send()
    },
  )
}
