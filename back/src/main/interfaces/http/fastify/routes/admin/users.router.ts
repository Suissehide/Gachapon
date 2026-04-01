import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  adminUserDustBodySchema,
  adminUserIdParamSchema,
  adminUserRewardBodySchema,
  adminUserRoleBodySchema,
  adminUserSuspendBodySchema,
  adminUserTokensBodySchema,
  adminUsersQuerySchema,
} from '../../schemas/admin-users.schema'

export const adminUsersRouter: FastifyPluginCallbackZod = (fastify) => {
  const { userRepository, gachaPullRepository, userCardRepository, rewardsDomain } =
    fastify.iocContainer

  fastify.get(
    '/',
    { schema: { querystring: adminUsersQuerySchema } },
    async (request) => {
      const { page, limit, search } = request.query
      return userRepository.findAllPaginated({ page, limit, search })
    },
  )

  fastify.get(
    '/:id',
    { schema: { params: adminUserIdParamSchema } },
    async (request) => {
      const { id } = request.params
      const user = await userRepository.findById(id)
      if (!user) throw Boom.notFound('User not found')

      const [pullsTotal, dustGenerated, cardsOwned] = await Promise.all([
        gachaPullRepository.countByUser(id),
        gachaPullRepository.sumDustEarnedByUser(id),
        userCardRepository.countByUser(id),
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
        stats: { pullsTotal, dustGenerated, cardsOwned },
      }
    },
  )

  fastify.get(
    '/:id/collection',
    { schema: { params: adminUserIdParamSchema } },
    async (request) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')

      const userCards = await userCardRepository.findByUser(request.params.id)
      return {
        cards: userCards.map((uc) => ({
          card: {
            id: uc.card.id,
            name: uc.card.name,
            imageUrl: uc.card.imageUrl,
            rarity: uc.card.rarity,
            variant: uc.variant,
            set: { id: uc.card.set.id, name: uc.card.set.name },
          },
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  fastify.patch(
    '/:id/tokens',
    { schema: { params: adminUserIdParamSchema, body: adminUserTokensBodySchema } },
    async (request) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')
      return userRepository.incrementTokens(request.params.id, request.body.amount)
    },
  )

  fastify.patch(
    '/:id/dust',
    { schema: { params: adminUserIdParamSchema, body: adminUserDustBodySchema } },
    async (request) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')
      return userRepository.incrementDust(request.params.id, request.body.amount)
    },
  )

  fastify.patch(
    '/:id/role',
    { schema: { params: adminUserIdParamSchema, body: adminUserRoleBodySchema } },
    async (request) => {
      if (request.params.id === request.user.userID) {
        throw Boom.forbidden('Cannot change your own role')
      }
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')
      return userRepository.updateRole(request.params.id, request.body.role)
    },
  )

  fastify.post(
    '/:id/rewards',
    {
      schema: {
        params: adminUserIdParamSchema,
        body: adminUserRewardBodySchema,
        response: { 201: { type: 'object', properties: { id: { type: 'string' } } } },
      },
    },
    async (request, reply) => {
      const userReward = await rewardsDomain.addRewardToUser(request.params.id, request.body)
      return reply.status(201).send({ id: userReward.id })
    },
  )

  fastify.patch(
    '/:id/suspend',
    { schema: { params: adminUserIdParamSchema, body: adminUserSuspendBodySchema } },
    async (request) => {
      if (request.params.id === request.user.userID) {
        throw Boom.forbidden('Cannot suspend your own account')
      }
      const user = await userRepository.findById(request.params.id)
      if (!user) throw Boom.notFound('User not found')
      return userRepository.updateSuspended(request.params.id, request.body.suspended)
    },
  )
}
