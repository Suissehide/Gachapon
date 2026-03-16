import Boom from '@hapi/boom'

import { OAuthProvider } from '../../../generated/enums'
import type { Config } from '../../application/config'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository'
import type { IocContainer } from '../../types/application/ioc'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface'
import type { TokenPair } from '../../types/domain/auth/auth.types'
import type {
  OAuthDomainInterface,
  OAuthProviderName,
} from '../../types/domain/auth/oauth.domain.interface'
import type { UserEntity } from '../../types/domain/user/user.types'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

type OAuthUserInfo = { id: string; email: string; username: string }

export class OAuthDomain implements OAuthDomainInterface {
  readonly #config: Config
  readonly #userRepository: UserRepositoryInterface
  readonly #oauthAccountRepository: OAuthAccountRepository
  readonly #authDomain: AuthDomainInterface

  constructor({
    config,
    userRepository,
    oauthAccountRepository,
    authDomain,
  }: IocContainer) {
    this.#config = config
    this.#userRepository = userRepository
    this.#oauthAccountRepository = oauthAccountRepository
    this.#authDomain = authDomain
  }

  getAuthorizationUrl(provider: OAuthProviderName, state: string): string {
    if (provider === 'google') {
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
        {
          client_id: this.#config.googleClientId,
          redirect_uri: this.#config.googleRedirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          state,
        },
      )}`
    }
    if (provider === 'discord') {
      return `https://discord.com/api/oauth2/authorize?${new URLSearchParams({
        client_id: this.#config.discordClientId,
        redirect_uri: this.#config.discordRedirectUri,
        response_type: 'code',
        scope: 'identify email',
        state,
      })}`
    }
    throw Boom.badRequest('Unknown provider')
  }

  async handleCallback(
    provider: OAuthProviderName,
    code: string,
  ): Promise<{ user: UserEntity; tokens: TokenPair; isNew: boolean }> {
    const userInfo =
      provider === 'google'
        ? await this.#fetchGoogleUser(code)
        : await this.#fetchDiscordUser(code)

    const prismaProvider =
      provider === 'google' ? OAuthProvider.GOOGLE : OAuthProvider.DISCORD
    const existingAccount = await this.#oauthAccountRepository.findByProvider(
      prismaProvider,
      userInfo.id,
    )

    if (existingAccount) {
      const user = await this.#userRepository.findById(existingAccount.userId)
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const tokens = await this.#authDomain.generateTokenPair(user)
      return { user, tokens, isNew: false }
    }

    let user = await this.#userRepository.findByEmail(userInfo.email)
    let isNew = false

    if (!user) {
      const username = await this.#availableUsername(userInfo.username)
      user = await this.#userRepository.create({
        username,
        email: userInfo.email,
      })
      isNew = true
    }

    await this.#oauthAccountRepository.create(
      user.id,
      prismaProvider,
      userInfo.id,
    )
    const tokens = await this.#authDomain.generateTokenPair(user)
    return { user, tokens, isNew }
  }

  async #fetchGoogleUser(code: string): Promise<OAuthUserInfo> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.#config.googleClientId,
        client_secret: this.#config.googleClientSecret,
        redirect_uri: this.#config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      throw Boom.badGateway('OAuth provider token exchange failed')
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }
    const userRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    )
    if (!userRes.ok) {
      throw Boom.badGateway('OAuth provider userinfo fetch failed')
    }
    const u = (await userRes.json()) as {
      id: string
      email: string
      name: string
    }
    return {
      id: u.id,
      email: u.email,
      username: u.name.replace(/\s+/g, '_').toLowerCase(),
    }
  }

  async #fetchDiscordUser(code: string): Promise<OAuthUserInfo> {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.#config.discordClientId,
        client_secret: this.#config.discordClientSecret,
        redirect_uri: this.#config.discordRedirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      throw Boom.badGateway('OAuth provider token exchange failed')
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      throw Boom.badGateway('OAuth provider userinfo fetch failed')
    }
    const u = (await userRes.json()) as {
      id: string
      email: string
      username: string
    }
    return { id: u.id, email: u.email, username: u.username }
  }

  async #availableUsername(base: string): Promise<string> {
    const sanitized = base.replace(/[^a-zA-Z0-9_]/g, '_')
    let username = sanitized.slice(0, 28)
    let i = 1
    while (await this.#userRepository.findByUsername(username)) {
      username = `${sanitized.slice(0, 25)}_${i++}`
    }
    return username
  }
}
