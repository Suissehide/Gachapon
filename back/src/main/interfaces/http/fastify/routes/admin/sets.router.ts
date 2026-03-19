// back/src/main/interfaces/http/fastify/routes/admin/sets.router.ts
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const adminSetsRouter: FastifyPluginCallbackZod = (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]

  fastify.get('/', { onRequest: auth }, async () => {
    const sets = await fastify.iocContainer.postgresOrm.prisma.cardSet.findMany(
      {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { cards: true } } },
      },
    )
    return { sets }
  })

  fastify.post(
    '/',
    {
      onRequest: auth,
      schema: {
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          isActive: z.boolean().default(false),
        }),
      },
    },
    async (request, reply) => {
      const set = await fastify.iocContainer.postgresOrm.prisma.cardSet.create({
        data: request.body,
      })
      return reply.status(201).send(set)
    },
  )

  fastify.patch(
    '/:id',
    {
      onRequest: auth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const set =
        await fastify.iocContainer.postgresOrm.prisma.cardSet.findUnique({
          where: { id: request.params.id },
        })
      if (!set) {
        throw Boom.notFound('Set not found')
      }
      return fastify.iocContainer.postgresOrm.prisma.cardSet.update({
        where: { id: request.params.id },
        data: request.body,
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
      const set =
        await fastify.iocContainer.postgresOrm.prisma.cardSet.findUnique({
          where: { id: request.params.id },
        })
      if (!set) {
        throw Boom.notFound('Set not found')
      }
      await fastify.iocContainer.postgresOrm.prisma.cardSet.delete({
        where: { id: request.params.id },
      })
      return reply.status(204).send()
    },
  )
}
