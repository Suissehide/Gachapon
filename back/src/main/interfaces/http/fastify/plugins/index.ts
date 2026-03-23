import fastifyAccepts from '@fastify/accepts'
import fastifyCors, { type FastifyCorsOptions } from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fastifyGracefulShutdown from 'fastify-graceful-shutdown'
import fastifyPlugin from 'fastify-plugin'

import { registerPlugin } from '../util/fastify-plugin.registerer'
import { awilixPlugin } from './awilix.plugin'
import { cookiePlugin } from './cookie.plugin'
import { jwtPlugin } from './jwt.plugin'
import { ormPlugin } from './orm.plugin'
import { redisPlugin } from './redis.plugin'
import { rateLimitPlugin } from './rate-limit.plugin'
import { rolePlugin } from './role.plugin'
import { websocketPlugin } from './websocket.plugin'

const plugins: FastifyPluginAsync = fastifyPlugin(
  async (fastify: FastifyInstance) => {
    const { iocContainer, log } = fastify
    const { config } = iocContainer
    log.info('Registering plugins')
    const shutdownOptions = { timeout: 5000 }
    if (process.env.CI) {
      await registerPlugin(
        fastify,
        'gracefulShutdown',
        fastifyGracefulShutdown,
        shutdownOptions,
      )
    }
    await registerPlugin(fastify, 'cookie', cookiePlugin)
    await registerPlugin(fastify, 'jwt', jwtPlugin)
    await registerPlugin(fastify, 'role', rolePlugin)
    await registerPlugin<FastifyCorsOptions>(fastify, 'cors', fastifyCors, {
      origin: config.corsOrigin ?? config.frontUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-API-Key'],
      exposedHeaders: ['Set-Cookie'],
    })
    await registerPlugin(fastify, 'rate-limit', rateLimitPlugin)
    await registerPlugin(fastify, 'accepts', fastifyAccepts)
    await registerPlugin(fastify, 'multipart', fastifyMultipart, {
      attachFieldsToBody: false, // streaming manuel vers MinIO
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max — sets truncated=true, handler accumulates errors
      throwFileSizeLimit: false,
    })
    await registerPlugin(fastify, 'awilix', awilixPlugin)
    await registerPlugin(fastify, 'orm', ormPlugin)
    await registerPlugin(fastify, 'redis', redisPlugin)
    await registerPlugin(fastify, 'websocket', websocketPlugin)

    log.info('All plugins registered')
  },
)

export { plugins }
