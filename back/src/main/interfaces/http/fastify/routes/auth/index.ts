import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerRouter } from './register.router.js'
import { loginRouter } from './login.router.js'
import { logoutRouter } from './logout.router.js'
import { refreshRouter } from './refresh.router.js'
import { meRouter } from './me.router.js'

export const authRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(registerRouter, { prefix: '/register' })
  await fastify.register(loginRouter, { prefix: '/login' })
  await fastify.register(logoutRouter, { prefix: '/logout' })
  await fastify.register(refreshRouter, { prefix: '/refresh' })
  await fastify.register(meRouter, { prefix: '/me' })
}
