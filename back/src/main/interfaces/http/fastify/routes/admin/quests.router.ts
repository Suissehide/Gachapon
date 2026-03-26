import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const questSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  criterion: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const adminQuestsRouter: FastifyPluginCallbackZod = (fastify) => {
  const prisma = () => fastify.iocContainer.postgresOrm.prisma

  fastify.get('/', async () => {
    const quests = await prisma().quest.findMany({ orderBy: { name: 'asc' } })
    return { quests }
  })

  fastify.post(
    '/',
    { schema: { body: questSchema } },
    async (request, reply) => {
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
      const quest = await prisma().quest.create({ data: request.body as any })
      return reply.status(201).send(quest)
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: questSchema.partial(),
      },
    },
    async (request) => {
      const quest = await prisma().quest.findUnique({
        where: { id: request.params.id },
      })
      if (!quest) {
        throw Boom.notFound('Quest not found')
      }
      // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
      return prisma().quest.update({
        where: { id: request.params.id },
        data: request.body as any,
      })
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const quest = await prisma().quest.findUnique({
        where: { id: request.params.id },
      })
      if (!quest) {
        throw Boom.notFound('Quest not found')
      }
      await prisma().quest.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    },
  )
}
