import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { forgotPasswordRouter } from './forgot-password.router'
import { loginRouter } from './login.router'
import { logoutRouter } from './logout.router'
import { meRouter } from './me.router'
import { oauthRouter } from './oauth'
import { refreshRouter } from './refresh.router'
import { registerRouter } from './register.router'
import { resendVerificationRouter } from './resend-verification.router'
import { resetPasswordAuthRouter } from './reset-password-auth.router'
import { verifyEmailRouter } from './verify-email.router'

export const authRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(registerRouter, { prefix: '/register' })
  await fastify.register(loginRouter, { prefix: '/login' })
  await fastify.register(logoutRouter, { prefix: '/logout' })
  await fastify.register(refreshRouter, { prefix: '/refresh' })
  await fastify.register(meRouter, { prefix: '/me' })
  await fastify.register(oauthRouter, { prefix: '/oauth' })
  await fastify.register(verifyEmailRouter, { prefix: '/verify-email' })
  await fastify.register(resendVerificationRouter, {
    prefix: '/resend-verification',
  })
  await fastify.register(forgotPasswordRouter, { prefix: '/forgot-password' })
  await fastify.register(resetPasswordAuthRouter, { prefix: '/reset-password' })
}
