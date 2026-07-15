import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  checkWithTimeout,
  serviceStatus,
} from '../../../../../domain/health/health-status'
import { wsManager } from '../../../../ws/ws-manager'

export const adminHealthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { postgresOrm, redisClient, storageClient } = fastify.iocContainer

  fastify.get('/', async () => {
    const [pg, redis, storage] = await Promise.all([
      checkWithTimeout(() => postgresOrm.healthCheck()),
      checkWithTimeout(() => redisClient.healthCheck()),
      checkWithTimeout(() => storageClient.healthCheck()),
    ])
    const memory = process.memoryUsage()
    return {
      services: {
        postgres: {
          status: serviceStatus(pg.ok, pg.latencyMs),
          latencyMs: pg.latencyMs,
        },
        redis: {
          status: serviceStatus(redis.ok, redis.latencyMs),
          latencyMs: redis.latencyMs,
        },
        storage: {
          status: serviceStatus(storage.ok, storage.latencyMs),
          latencyMs: storage.latencyMs,
        },
      },
      ws: { connections: wsManager.size },
      process: {
        uptimeSeconds: process.uptime(),
        memory: { rss: memory.rss, heapUsed: memory.heapUsed },
      },
    }
  })
}
