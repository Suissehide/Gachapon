import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { adminActivityQuerySchema } from '../../schemas/admin-activity.schema'

export const adminActivityRouter: FastifyPluginCallbackZod = (fastify) => {
  const { activityDomain } = fastify.iocContainer

  fastify.get(
    '/',
    { schema: { querystring: adminActivityQuerySchema } },
    async (request) => {
      const { cursor, limit, type } = request.query
      const { events, nextCursor } = await activityDomain.list({
        cursor,
        limit,
        type,
      })
      return {
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          payload: e.payload,
          createdAt: e.createdAt.toISOString(),
          user: e.user,
        })),
        nextCursor,
      }
    },
  )
}
