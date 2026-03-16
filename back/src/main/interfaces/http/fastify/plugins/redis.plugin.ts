import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export const redisPlugin = fp((fastify: FastifyInstance) => {
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
