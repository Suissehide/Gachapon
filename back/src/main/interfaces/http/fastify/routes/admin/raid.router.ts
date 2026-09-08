import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { RaidTierWithReward } from '../../../../../types/infra/orm/repositories/raid.repository.interface'
import {
  adminRaidBossParamSchema,
  adminRaidBossPatchBodySchema,
  adminRaidTierParamSchema,
  adminRaidTierPatchBodySchema,
} from '../../schemas/admin-raid.schema'

function formatTier(t: RaidTierWithReward) {
  return {
    id: t.id,
    pct: t.pct,
    tokens: t.reward.tokens,
    dust: t.reward.dust,
    gold: t.reward.gold,
    xp: t.reward.xp,
    cardRarity: t.reward.cardRarity,
  }
}

export const adminRaidRouter: FastifyPluginCallbackZod = (fastify) => {
  const { raidRepository } = fastify.iocContainer

  fastify.get('/bosses', async () => ({
    bosses: await raidRepository.listBosses(),
  }))

  fastify.patch(
    '/bosses/:element',
    {
      schema: {
        params: adminRaidBossParamSchema,
        body: adminRaidBossPatchBodySchema,
      },
    },
    async (request) => {
      const existing = await raidRepository.findBossByElement(
        request.params.element,
      )
      if (!existing) {
        throw Boom.notFound('Boss de raid introuvable — lancer le seed')
      }
      return raidRepository.updateBoss(request.params.element, request.body)
    },
  )

  fastify.get('/tiers', async () => ({
    tiers: (await raidRepository.listTiers()).map(formatTier),
  }))

  fastify.patch(
    '/tiers/:pct',
    {
      schema: {
        params: adminRaidTierParamSchema,
        body: adminRaidTierPatchBodySchema,
      },
    },
    async (request) => {
      const tier = await raidRepository.findTierByPct(request.params.pct)
      if (!tier) {
        throw Boom.notFound('Palier introuvable')
      }
      return formatTier(
        await raidRepository.updateTierReward(request.params.pct, request.body),
      )
    },
  )
}
