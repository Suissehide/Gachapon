// back/src/main/interfaces/http/fastify/routes/admin/quests.router.ts
import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const questSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  criterion: z.record(z.string(), z.unknown()),
  rewardTokens: z.number().int().min(0).default(0),
  rewardDust: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminQuestsRouter: FastifyPluginAsyncZod = async (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]
  const prisma = () => fastify.iocContainer.postgresOrm.prisma

  fastify.get('/', { onRequest: auth }, async () => {
    const quests = await prisma().quest.findMany({ orderBy: { name: 'asc' } })
    return { quests }
  })

  fastify.post('/', { onRequest: auth, schema: { body: questSchema } }, async (request, reply) => {
    const quest = await prisma().quest.create({ data: request.body })
    return reply.status(201).send(quest)
  })

  fastify.patch(
    '/:id',
    { onRequest: auth, schema: { params: z.object({ id: z.string().uuid() }), body: questSchema.partial() } },
    async (request) => {
      const quest = await prisma().quest.findUnique({ where: { id: request.params.id } })
      if (!quest) throw Boom.notFound('Quest not found')
      return prisma().quest.update({ where: { id: request.params.id }, data: request.body })
    },
  )

  fastify.delete(
    '/:id',
    { onRequest: auth, schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const quest = await prisma().quest.findUnique({ where: { id: request.params.id } })
      if (!quest) throw Boom.notFound('Quest not found')
      await prisma().quest.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    },
  )
}
