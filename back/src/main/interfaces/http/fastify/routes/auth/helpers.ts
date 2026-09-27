import type { FastifyReply, FastifyRequest } from 'fastify'

import { OAuthLinkConflictError } from '../../../../../domain/auth/oauth.domain'
import type { TokenPair } from '../../../../../types/domain/auth/auth.types'
import type {
  OAuthDomainInterface,
  OAuthProviderName,
} from '../../../../../types/domain/auth/oauth.domain.interface'
import type { UserEntity } from '../../../../../types/domain/user/user.types'

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setTokenCookies(
  reply: FastifyReply,
  { accessToken, refreshToken }: TokenPair,
): void {
  reply
    .setCookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 })
    .setCookie('refresh_token', refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 30 * 24 * 60 * 60,
    })
}

export function sanitizeUser(
  user: UserEntity,
): Omit<UserEntity, 'passwordHash'> {
  const { passwordHash: _pw, ...safe } = user
  return safe
}

/**
 * Fin commune des callbacks Google/Discord : résout le `linkUserId` depuis le
 * cookie SIGNÉ `oauth_link` posé par `/authorize?mode=link`, appelle
 * `handleCallback`, puis redirige vers `/oauth/success` (avec `linked=1` ou
 * `link_error=account_exists` en cas de conflit).
 */
export async function completeOAuthCallback(
  oauthDomain: OAuthDomainInterface,
  provider: OAuthProviderName,
  code: string,
  request: FastifyRequest,
  reply: FastifyReply,
  frontUrl: string,
): Promise<FastifyReply> {
  const rawLink = request.cookies.oauth_link
  const unsigned = rawLink ? request.unsignCookie(rawLink) : null
  const linkUserId = unsigned?.valid ? (unsigned.value ?? undefined) : undefined
  reply.clearCookie('oauth_link', { path: '/' })
  try {
    const { tokens, linked } = await oauthDomain.handleCallback(
      provider,
      code,
      linkUserId,
    )
    setTokenCookies(reply, tokens)
    reply.clearCookie('oauth_state', { path: '/' })
    return reply.redirect(
      `${frontUrl}/oauth/success${linked ? '?linked=1' : ''}`,
    )
  } catch (err) {
    if (err instanceof OAuthLinkConflictError) {
      reply.clearCookie('oauth_state', { path: '/' })
      return reply.redirect(
        `${frontUrl}/oauth/success?link_error=account_exists`,
      )
    }
    throw err
  }
}
