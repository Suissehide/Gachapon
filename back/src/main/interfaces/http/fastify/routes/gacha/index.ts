import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { calculateTokens } from '../../../../../domain/economy/economy.domain'
import { computeDropRates } from '../../../../../domain/gacha/drop-rates'
import { effectivePityThreshold } from '../../../../../domain/gacha/gacha.domain'
import { wsManager } from '../../../../ws/ws-manager'
import {
  dropRatesResponseSchema,
  pullBatchBodySchema,
  pullBatchResponseSchema,
  pullResponseSchema,
  pullsHistoryQuerySchema,
  pullsRecentQuerySchema,
  tokensBalanceResponseSchema,
} from '../../schemas/gacha.schemas'

export const gachaRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    gachaDomain,
    userRepository,
    configService,
    gachaPullRepository,
    skillTreeRepository,
    storageClient,
    cardRepository,
  } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  // POST /pulls — consommer 1 token et tirer une carte
  fastify.post(
    '/pulls',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 201: pullResponseSchema } },
    },
    async (request, reply) => {
      const result = await gachaDomain.pull(request.user.userID)
      const user = await userRepository.findById(request.user.userID)

      wsManager.notify(request.user.userID, {
        type: 'pull:result',
        card: {
          id: result.card.id,
          name: result.card.name,
          imageUrl: resolveUrl(result.card.imageUrl),
          rarity: result.card.rarity,
          variant: result.pull.variant,
          set: { id: result.card.set.id, name: result.card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustEarned: result.dustEarned,
        tokensRemaining: result.tokensRemaining,
        pityCurrent: result.pityCurrent,
        xpGained: result.xpGained,
      })

      if (user) {
        wsManager.broadcast({
          type: 'feed:pull',
          username: user.username,
          cardName: result.card.name,
          rarity: result.card.rarity,
          variant: result.pull.variant,
          cardId: result.card.id,
          imageUrl: resolveUrl(result.card.imageUrl),
          setName: result.card.set.name,
          pulledAt: result.pull.pulledAt.toISOString(),
        })
      }

      return reply.status(201).send({
        card: {
          id: result.card.id,
          name: result.card.name,
          imageUrl: resolveUrl(result.card.imageUrl),
          rarity: result.card.rarity,
          variant: result.pull.variant,
          set: { id: result.card.set.id, name: result.card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustEarned: result.dustEarned,
        tokensRemaining: result.tokensRemaining,
        pityCurrent: result.pityCurrent,
        xpGained: result.xpGained,
        unlockedAchievements: result.unlockedAchievements,
        wasFreePull: result.wasFreePull,
        wasGoldenBall: result.wasGoldenBall,
        wasBoostGuarantee: result.wasBoostGuarantee,
      })
    },
  )

  // POST /pulls/batch — 1 ou 10 tirages atomiques
  fastify.post(
    '/pulls/batch',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: pullBatchBodySchema,
        response: { 201: pullBatchResponseSchema },
      },
    },
    async (request, reply) => {
      const { count } = request.body
      const result = await gachaDomain.pullBatch(request.user.userID, count)
      const user = await userRepository.findById(request.user.userID)

      const pullsPayload = result.pulls.map((p) => ({
        card: {
          id: p.card.id,
          name: p.card.name,
          imageUrl: resolveUrl(p.card.imageUrl),
          rarity: p.card.rarity,
          variant: p.pull.variant,
          set: { id: p.card.set.id, name: p.card.set.name },
        },
        wasDuplicate: p.wasDuplicate,
        dustEarned: p.dustEarned,
        pityCurrent: p.pityCurrent,
        wasFreePull: p.wasFreePull,
        wasGoldenBall: p.wasGoldenBall,
        wasBoostGuarantee: p.wasBoostGuarantee,
      }))

      wsManager.notify(request.user.userID, {
        type: 'pull:batch-result',
        pulls: pullsPayload,
        tokensRemaining: result.tokensRemaining,
        xpGained: result.xpGained,
      })

      if (user) {
        result.pulls.forEach((p, idx) => {
          setTimeout(() => {
            wsManager.broadcast({
              type: 'feed:pull',
              username: user.username,
              cardName: p.card.name,
              rarity: p.card.rarity,
              variant: p.pull.variant,
              cardId: p.card.id,
              imageUrl: resolveUrl(p.card.imageUrl),
              setName: p.card.set.name,
              pulledAt: p.pull.pulledAt.toISOString(),
            })
          }, idx * 50)
        })
      }

      return reply.status(201).send({
        pulls: pullsPayload,
        tokensRemaining: result.tokensRemaining,
        xpGained: result.xpGained,
        unlockedAchievements: result.unlockedAchievements,
      })
    },
  )

  // GET /tokens/balance — solde de tokens (calcul lazy, sans écriture en DB)
  fastify.get(
    '/tokens/balance',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: tokensBalanceResponseSchema } },
    },
    async (request) => {
      const user = await userRepository.findById(request.user.userID)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const [upgrades, cfg] = await Promise.all([
        skillTreeRepository.getEffectsForUser(request.user.userID),
        configService.getMany(
          'tokenRegenIntervalMinutes',
          'tokenMaxStock',
          'pityThreshold',
        ),
      ])
      const effectiveInterval = Math.max(
        1,
        cfg.tokenRegenIntervalMinutes - upgrades.regenReductionMinutes,
      )
      const effectiveMaxStock = cfg.tokenMaxStock + upgrades.tokenVaultBonus

      // Lecture seule : pas de roll multiToken (le bonus est roulé et persisté au moment du débit) — évite un compteur qui fluctue entre deux GET
      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        effectiveInterval,
        effectiveMaxStock,
        0,
      )

      return {
        tokens,
        maxStock: effectiveMaxStock,
        nextTokenAt: nextTokenAt?.toISOString() ?? null,
        pityCurrent: user.pityCurrent,
        pityThreshold: effectivePityThreshold(
          cfg.pityThreshold,
          upgrades.pityReduction ?? 0,
        ),
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

      // Lecture seule : pas de roll multiToken (le bonus est roulé et persisté au moment du débit) — évite un compteur qui fluctue entre deux GET
      const { tokens, nextTokenAt } = calculateTokens(
        user.lastTokenAt,
        user.tokens,
        effectiveInterval,
        effectiveMaxStock,
        0,
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
      schema: { querystring: pullsHistoryQuerySchema },
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
            imageUrl: resolveUrl(p.card.imageUrl),
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
      schema: { querystring: pullsRecentQuerySchema },
    },
    async (request) => {
      const { limit, before, teamId, rarities } = request.query
      const page = await gachaPullRepository.findRecent(limit, {
        before: before ? new Date(before) : undefined,
        teamId,
        rarities,
      })
      return {
        entries: page.entries.map((p) => ({
          username: p.username,
          cardName: p.cardName,
          rarity: p.rarity,
          variant: p.variant,
          cardId: p.cardId,
          imageUrl: resolveUrl(p.imageUrl),
          setName: p.setName,
          pulledAt: p.pulledAt.toISOString(),
        })),
        hasMore: page.hasMore,
      }
    },
  )

  // GET /pulls/rates — taux de drop de base par rareté (public, hors bonus)
  fastify.get(
    '/pulls/rates',
    { schema: { response: { 200: dropRatesResponseSchema } } },
    async () => {
      const cards = await cardRepository.findAllActive()
      return { rates: computeDropRates(cards) }
    },
  )
}
