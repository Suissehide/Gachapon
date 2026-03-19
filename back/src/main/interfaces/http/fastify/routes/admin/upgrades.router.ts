import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const upgradeEntrySchema = z.object({
  type: z.enum(['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT']),
  level: z.number().int().min(1).max(4),
  effect: z.number().positive(),
  dustCost: z.number().int().min(0),
})

export const adminUpgradesRouter: FastifyPluginCallbackZod = (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]
  const { postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /admin/upgrades
  fastify.get('/', { onRequest: auth }, async () => {
    return await prisma.upgradeConfig.findMany({
      orderBy: [{ type: 'asc' }, { level: 'asc' }],
    })
  })

  // PUT /admin/upgrades — mise à jour bulk atomique
  fastify.put(
    '/',
    {
      onRequest: auth,
      schema: { body: z.object({ upgrades: z.array(upgradeEntrySchema) }) },
    },
    async (request) => {
      const { upgrades } = request.body

      await postgresOrm.executeWithTransactionClient(
        async (tx) => {
          for (const row of upgrades) {
            await tx.upgradeConfig.update({
              where: { type_level: { type: row.type, level: row.level } },
              data: { effect: row.effect, dustCost: row.dustCost },
            })
          }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

      return { updated: upgrades.length }
    },
  )
}
