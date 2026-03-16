import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { googleOAuthRouter } from './google.router.js'
import { discordOAuthRouter } from './discord.router.js'

export const oauthRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(googleOAuthRouter, { prefix: '/google' })
  await fastify.register(discordOAuthRouter, { prefix: '/discord' })
}
