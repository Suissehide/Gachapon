import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const UPGRADE_TYPES = ['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT'] as const
const MAX_LEVEL = 4

export const upgradesRouter: FastifyPluginCallbackZod = (fastify) => {
  const { postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /upgrades — niveaux actuels + infos prochain niveau
  fastify.get(
    '/upgrades',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const userId = request.user.userID

      const [userUpgrades, allConfigs] = await Promise.all([
        prisma.userUpgrade.findMany({ where: { userId } }),
        prisma.upgradeConfig.findMany({
          orderBy: [{ type: 'asc' }, { level: 'asc' }],
        }),
      ])

      const levelByType = Object.fromEntries(
        userUpgrades.map((u) => [u.type, u.level]),
      ) as Record<string, number>

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { dust: true },
      })

      return UPGRADE_TYPES.map((type) => {
        const currentLevel = levelByType[type] ?? 0
        const currentConfig = allConfigs.find(
          (c) => c.type === type && c.level === currentLevel,
        )
        const nextConfig =
          currentLevel < MAX_LEVEL
            ? allConfigs.find(
                (c) => c.type === type && c.level === currentLevel + 1,
              )
            : null

        return {
          type,
          currentLevel,
          currentEffect: currentConfig?.effect ?? null,
          nextLevel: nextConfig ? currentLevel + 1 : null,
          nextEffect: nextConfig?.effect ?? null,
          nextCost: nextConfig?.dustCost ?? null,
          canAfford: nextConfig ? user.dust >= nextConfig.dustCost : false,
          isMaxed: currentLevel >= MAX_LEVEL,
        }
      })
    },
  )

  // POST /upgrades/:type/buy — acheter le prochain niveau
  fastify.post(
    '/upgrades/:type/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({
          type: z.enum(['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT']),
        }),
      },
    },
    async (request) => {
      const userId = request.user.userID
      const { type } = request.params

      const existing = await prisma.userUpgrade.findUnique({
        where: { userId_type: { userId, type } },
      })
      const currentLevel = existing?.level ?? 0

      if (currentLevel >= MAX_LEVEL) {
        throw Boom.conflict('Upgrade already at maximum level')
      }

      const nextLevel = currentLevel + 1
      const config = await prisma.upgradeConfig.findUnique({
        where: { type_level: { type, level: nextLevel } },
      })
      if (!config) {
        throw Boom.internal('Upgrade config not found')
      }

      const result = await postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const user = await tx.user.findUniqueOrThrow({
            where: { id: userId },
          })

          if (user.dust < config.dustCost) {
            throw Boom.paymentRequired('Not enough dust')
          }

          const upgrade = await tx.userUpgrade.upsert({
            where: { userId_type: { userId, type } },
            create: { userId, type, level: nextLevel },
            update: { level: nextLevel },
          })

          const updated = await tx.user.update({
            where: { id: userId },
            data: { dust: { decrement: config.dustCost } },
          })

          return { upgrade, newDustTotal: updated.dust }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

      return {
        type,
        newLevel: result.upgrade.level,
        effect: config.effect,
        newDustTotal: result.newDustTotal,
      }
    },
  )
}
