import type { FastifyPluginAsync } from 'fastify/types/plugin'
import fastifyPlugin from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import fastifyCookie, { type FastifyCookieOptions } from '@fastify/cookie'
import { hashSecret } from '../../../../utils/auth-helper'

const cookiePlugin: FastifyPluginAsync = fastifyPlugin(
  async (fastify: FastifyInstance) => {
    const { iocContainer, log } = fastify
    const { config } = iocContainer
    const { jwtSecret } = config
    log.trace('Registering cookie plugin')
    const secret = hashSecret(jwtSecret)
    const cookieOptions: FastifyCookieOptions = {
      secret,
      hook: 'onRequest',
    }
    await fastify.register(fastifyCookie, cookieOptions)
    log.debug('Cookie plugin successfully registered')
  },
)

export { cookiePlugin }
