import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { discordOAuthRouter } from './discord.router'
import { googleOAuthRouter } from './google.router'

export const oauthRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(googleOAuthRouter, { prefix: '/google' })
  await fastify.register(discordOAuthRouter, { prefix: '/discord' })
}
