import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { calculateTokens } from '../../../../../domain/economy/economy.domain'
import { wsManager } from '../../../../ws/ws-manager'

export const gachaRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    gachaDomain,
    userRepository,
    configService,
    gachaPullRepository,
    skillTreeRepository,
  } = fastify.iocContainer

  // POST /pulls — consommer 1 token et tirer une carte
  fastify.post(
    '/pulls',
    { onRequest: [fastify.verifySessionCookie] },
    async (request, reply) => {
      const result = await gachaDomain.pull(request.user.userID)
      const user = await userRepository.findById(request.user.userID)

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

      if (user) {
        wsManager.broadcast({
          type: 'feed:pull',
          username: user.username,
          cardName: result.card.name,
          rarity: result.card.rarity,
          variant: result.pull.variant,
          cardId: result.card.id,
          imageUrl: result.card.imageUrl,
          setName: result.card.set.name,
          pulledAt: result.pull.pulledAt.toISOString(),
        })
      }

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

      const [upgrades, cfg] = await Promise.all([
        skillTreeRepository.getEffectsForUser(request.user.userID),
        configService.getMany('tokenRegenIntervalMinutes', 'tokenMaxStock'),
      ])
      const effectiveInterval = Math.max(
        1,
        cfg.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes,
      )
      const effectiveMaxStock = cfg.tokenMaxStock + upgrades.tokenVaultBonus

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

      const [upgrades, cfg] = await Promise.all([
        skillTreeRepository.getEffectsForUser(request.user.userID),
        configService.getMany('tokenRegenIntervalMinutes', 'tokenMaxStock'),
      ])
      const effectiveInterval = Math.max(
        1,
        cfg.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes,
      )
      const effectiveMaxStock = cfg.tokenMaxStock + upgrades.tokenVaultBonus

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

  // GET /pulls/recent — N derniers tirages (feed live)
  fastify.get(
    '/pulls/recent',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).default(20),
          before: z.string().datetime().optional(),
          teamId: z.string().uuid().optional(),
        }),
      },
    },
    async (request) => {
      const { limit, before, teamId } = request.query
      const page = await gachaPullRepository.findRecent(limit, {
        before: before ? new Date(before) : undefined,
        teamId,
      })
      return {
        entries: page.entries.map((p) => ({
          username: p.username,
          cardName: p.cardName,
          rarity: p.rarity,
          variant: p.variant,
          cardId: p.cardId,
          imageUrl: p.imageUrl,
          setName: p.setName,
          pulledAt: p.pulledAt.toISOString(),
        })),
        hasMore: page.hasMore,
      }
    },
  )
}
