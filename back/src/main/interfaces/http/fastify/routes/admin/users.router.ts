import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const adminUsersRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/users — liste paginée
  fastify.get(
    '/',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          search: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const { page, limit, search } = request.query
      const where = search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}
      const [users, total] = await Promise.all([
        postgresOrm.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            tokens: true,
            dust: true,
            suspended: true,
            createdAt: true,
          },
        }),
        postgresOrm.prisma.user.count({ where }),
      ])
      return { users, total, page, limit }
    },
  )

  // GET /admin/users/:id — détail + stats
  fastify.get(
    '/:id',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const { id } = request.params
      const user = await postgresOrm.prisma.user.findUnique({ where: { id } })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const [pullsTotal, dustGenerated, cardsOwned] = await Promise.all([
        postgresOrm.prisma.gachaPull.count({ where: { userId: id } }),
        postgresOrm.prisma.gachaPull.aggregate({
          where: { userId: id },
          _sum: { dustEarned: true },
        }),
        postgresOrm.prisma.userCard.count({ where: { userId: id } }),
      ])
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          tokens: user.tokens,
          dust: user.dust,
          suspended: user.suspended,
          createdAt: user.createdAt,
        },
        stats: {
          pullsTotal,
          dustGenerated: dustGenerated._sum.dustEarned ?? 0,
          cardsOwned,
        },
      }
    },
  )

  // GET /admin/users/:id/collection — bypass ownership check
  fastify.get(
    '/:id/collection',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({
        where: { id: request.params.id },
      })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const userCards = await postgresOrm.prisma.userCard.findMany({
        where: { userId: request.params.id },
        include: { card: { include: { set: true } } },
        orderBy: { obtainedAt: 'desc' },
      })
      return {
        cards: userCards.map((uc) => ({
          card: {
            id: uc.card.id,
            name: uc.card.name,
            imageUrl: uc.card.imageUrl,
            rarity: uc.card.rarity,
            variant: uc.card.variant,
            set: { id: uc.card.set.id, name: uc.card.set.name },
          },
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  // PATCH /admin/users/:id/tokens
  fastify.patch(
    '/:id/tokens',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ amount: z.number().int() }),
      },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({
        where: { id: request.params.id },
      })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { tokens: { increment: request.body.amount } },
      })
      return { tokens: updated.tokens }
    },
  )

  // PATCH /admin/users/:id/dust
  fastify.patch(
    '/:id/dust',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ amount: z.number().int() }),
      },
    },
    async (request) => {
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({
        where: { id: request.params.id },
      })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { dust: { increment: request.body.amount } },
      })
      return { dust: updated.dust }
    },
  )

  // PATCH /admin/users/:id/role
  fastify.patch(
    '/:id/role',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ role: z.enum(['USER', 'SUPER_ADMIN']) }),
      },
    },
    async (request) => {
      if (request.params.id === request.user.userID) {
        throw Boom.forbidden('Cannot change your own role')
      }
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({
        where: { id: request.params.id },
      })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role },
      })
      return { role: updated.role }
    },
  )

  // PATCH /admin/users/:id/suspend
  fastify.patch(
    '/:id/suspend',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ suspended: z.boolean() }),
      },
    },
    async (request) => {
      if (request.params.id === request.user.userID) {
        throw Boom.forbidden('Cannot suspend your own account')
      }
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.findUnique({
        where: { id: request.params.id },
      })
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const updated = await postgresOrm.prisma.user.update({
        where: { id: request.params.id },
        data: { suspended: request.body.suspended },
      })
      return { suspended: updated.suspended }
    },
  )
}
