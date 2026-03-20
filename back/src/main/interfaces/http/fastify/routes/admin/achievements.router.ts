import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const achievementSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  rewardTokens: z.number().int().min(0).default(0),
  rewardDust: z.number().int().min(0).default(0),
})

export const adminAchievementsRouter: FastifyPluginCallbackZod = (fastify) => {
  const prisma = () => fastify.iocContainer.postgresOrm.prisma

  fastify.get('/', async () => {
    const achievements = await prisma().achievement.findMany({
      orderBy: { name: 'asc' },
    })
    return { achievements }
  })

  fastify.post(
    '/',
    { schema: { body: achievementSchema } },
    async (request, reply) => {
      const achievement = await prisma().achievement.create({
        data: request.body,
      })
      return reply.status(201).send(achievement)
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: achievementSchema.partial(),
      },
    },
    async (request) => {
      const achievement = await prisma().achievement.findUnique({
        where: { id: request.params.id },
      })
      if (!achievement) {
        throw Boom.notFound('Achievement not found')
      }
      return prisma().achievement.update({
        where: { id: request.params.id },
        data: request.body,
      })
    },
  )

  fastify.delete(
    '/:id',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request, reply) => {
      const achievement = await prisma().achievement.findUnique({
        where: { id: request.params.id },
      })
      if (!achievement) {
        throw Boom.notFound('Achievement not found')
      }
      await prisma().achievement.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    },
  )
}
