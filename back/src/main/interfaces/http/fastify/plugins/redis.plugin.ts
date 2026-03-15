import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const { redisClient, logger } = fastify.iocContainer

  fastify.addHook('onReady', async () => {
    await redisClient.client.connect()
    logger.info('Redis connected')
  })

  fastify.addHook('onClose', async () => {
    await redisClient.client.quit()
    logger.info('Redis disconnected')
  })
})
