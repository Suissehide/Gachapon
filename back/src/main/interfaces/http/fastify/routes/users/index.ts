import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const userProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  level: z.number().int(),
  xp: z.number().int(),
  dust: z.number().int(),
  createdAt: z.date(),
  stats: z.object({
    totalPulls: z.number().int(),
    ownedCards: z.number().int(),
    legendaryCount: z.number().int(),
    dustGenerated: z.number().int(),
  }),
})

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const usersRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { userRepository, postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  fastify.get(
    '/users/:username/profile',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ username: z.string().min(1).max(30) }),
        response: { 200: userProfileResponseSchema },
      },
    },
    async (request) => {
      const { username } = request.params

      const user = await userRepository.findByUsername(username)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const [totalPulls, ownedCards, legendaryCount, dustAgg] =
        await Promise.all([
          prisma.gachaPull.count({ where: { userId: user.id } }),
          prisma.userCard.count({ where: { userId: user.id } }),
          prisma.userCard.count({
            where: { userId: user.id, card: { rarity: 'LEGENDARY' } },
          }),
          prisma.gachaPull.aggregate({
            where: { userId: user.id },
            _sum: { dustEarned: true },
          }),
        ])

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        banner: user.banner,
        level: user.level,
        xp: user.xp,
        dust: user.dust,
        createdAt: user.createdAt,
        stats: {
          totalPulls,
          ownedCards,
          legendaryCount,
          dustGenerated: dustAgg._sum.dustEarned ?? 0,
        },
      }
    },
  )
}
