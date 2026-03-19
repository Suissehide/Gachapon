// back/src/main/interfaces/http/fastify/routes/admin/shop.router.ts
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const shopItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['TOKEN_PACK', 'BOOST', 'COSMETIC']),
  dustCost: z.number().int().min(0),
  value: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const adminShopRouter: FastifyPluginCallbackZod = (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]
  const prisma = () => fastify.iocContainer.postgresOrm.prisma

  fastify.get('/', { onRequest: auth }, async () => {
    const items = await prisma().shopItem.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { items }
  })

  fastify.post(
    '/',
    { onRequest: auth, schema: { body: shopItemSchema } },
    async (request, reply) => {
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
      const item = await prisma().shopItem.create({ data: request.body as any })
      return reply.status(201).send(item)
    },
  )

  fastify.patch(
    '/:id',
    {
      onRequest: auth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: shopItemSchema.partial(),
      },
    },
    async (request) => {
      const item = await prisma().shopItem.findUnique({
        where: { id: request.params.id },
      })
      if (!item) {
        throw Boom.notFound('Shop item not found')
      }
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
      return prisma().shopItem.update({
        where: { id: request.params.id },
        data: request.body as any,
      })
    },
  )

  fastify.delete(
    '/:id',
    {
      onRequest: auth,
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      const item = await prisma().shopItem.findUnique({
        where: { id: request.params.id },
      })
      if (!item) {
        throw Boom.notFound('Shop item not found')
      }
      await prisma().shopItem.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    },
  )
}
