import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { calculateTokens } from '../../../../../domain/economy/economy.domain'
import { getUserUpgradeEffects } from '../../../../../domain/economy/upgrade.domain'
import { wsManager } from '../../../../ws/ws-manager'

export const gachaRouter: FastifyPluginCallbackZod = (fastify) => {
  const { gachaDomain, userRepository, config, gachaPullRepository, postgresOrm } =
    fastify.iocContainer
  const prisma = postgresOrm.prisma

  // POST /pulls — consommer 1 token et tirer une carte
  fastify.post(
    '/pulls',
    { onRequest: [fastify.verifySessionCookie] },
    async (request, reply) => {
      const result = await gachaDomain.pull(request.user.userID)

      wsManager.notify(request.user.userID, {
        type: 'pull:result',
        card: {
          id: result.card.id,
          name: result.card.name,
          imageUrl: result.card.imageUrl,
          rarity: result.card.rarity,
          variant: result.pull.variant,
          set: { id: result.card.set.id, name: result.card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustEarned: result.dustEarned,
        tokensRemaining: result.tokensRemaining,
        pityCurrent: result.pityCurrent,
      })

      return reply.status(201).send({
        card: {
          id: result.card.id,
          name: result.card.name,
          imageUrl: result.card.imageUrl,
          rarity: result.card.rarity,
          variant: result.pull.variant,
          set: { id: result.card.set.id, name: result.card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustEarned: result.dustEarned,
        tokensRemaining: result.tokensRemaining,
        pityCurrent: result.pityCurrent,
      })
    },
  )

  // GET /tokens/balance — solde de tokens (calcul lazy, sans écriture en DB)
  fastify.get(
    '/tokens/balance',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const user = await userRepository.findById(request.user.userID)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const upgrades = await getUserUpgradeEffects(request.user.userID, prisma)
      const effectiveInterval = Math.max(1, config.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes)
      const effectiveMaxStock = config.tokenMaxStock + upgrades.tokenVaultBonus

      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        effectiveInterval,
        effectiveMaxStock,
      )

      return {
        tokens,
        maxStock: effectiveMaxStock,
        nextTokenAt: nextTokenAt?.toISOString() ?? null,
      }
    },
  )

  // GET /tokens/next-at — quand le prochain token sera prêt
  fastify.get(
    '/tokens/next-at',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const user = await userRepository.findById(request.user.userID)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const upgrades = await getUserUpgradeEffects(request.user.userID, prisma)
      const effectiveInterval = Math.max(1, config.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes)
      const effectiveMaxStock = config.tokenMaxStock + upgrades.tokenVaultBonus

      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        effectiveInterval,
        effectiveMaxStock,
      )

      return {
        nextTokenAt: nextTokenAt?.toISOString() ?? null,
        tokens,
      }
    },
  )

  // GET /pulls/history — historique paginé
  fastify.get(
    '/pulls/history',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
      },
    },
    async (request) => {
      const { page, limit } = request.query
      const skip = (page - 1) * limit
      const { pulls, total } = await gachaPullRepository.findByUser(
        request.user.userID,
        { skip, take: limit },
      )

      return {
        pulls: pulls.map((p) => ({
          id: p.id,
          pulledAt: p.pulledAt.toISOString(),
          wasDuplicate: p.wasDuplicate,
          dustEarned: p.dustEarned,
          card: {
            id: p.card.id,
            name: p.card.name,
            imageUrl: p.card.imageUrl,
            rarity: p.card.rarity,
            variant: p.variant,
          },
        })),
        total,
        page,
        limit,
      }
    },
  )
}
