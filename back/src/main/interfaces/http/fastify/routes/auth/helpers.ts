import type { FastifyReply } from 'fastify'
import type { TokenPair } from '../../../../../types/domain/auth/auth.types.js'
import type { UserEntity } from '../../../../../types/domain/user/user.types.js'

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setTokenCookies(reply: FastifyReply, { accessToken, refreshToken }: TokenPair): void {
  reply
    .setCookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 })
    .setCookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 })
}

export function sanitizeUser(user: UserEntity): Omit<UserEntity, 'passwordHash'> {
  const { passwordHash: _pw, ...safe } = user
  return safe
}
