import Boom from '@hapi/boom'

import { OAuthProvider } from '../../../generated/enums'
import type { Config } from '../../application/config'
import { errorMessage } from '../../infra/i18n/error-messages'
import { getCurrentLocale } from '../../infra/i18n/locale-context'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository'
import type { IocContainer } from '../../types/application/ioc'
import type { IActivityDomain } from '../../types/domain/activity/activity.domain.interface'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface'
import type { TokenPair } from '../../types/domain/auth/auth.types'
import type {
  OAuthDomainInterface,
  OAuthMode,
  OAuthProviderName,
  OAuthUserInfo,
} from '../../types/domain/auth/oauth.domain.interface'
import type { StreakDomainInterface } from '../../types/domain/streak/streak.domain.interface'
import type { UserEntity } from '../../types/domain/user/user.types'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

/** Conflit de liaison : l'appelant redirige vers `?link_error=account_exists`. */
export class OAuthLinkConflictError extends Error {
  constructor() {
    super('OAUTH_LINK_CONFLICT')
    this.name = 'OAuthLinkConflictError'
  }
}

export class OAuthDomain implements OAuthDomainInterface {
  readonly #config: Config
  readonly #userRepository: UserRepositoryInterface
  readonly #oauthAccountRepository: OAuthAccountRepository
  readonly #authDomain: AuthDomainInterface
  readonly #postgresOrm: PostgresOrm
  readonly #streakDomain: StreakDomainInterface
  readonly #configService: ConfigServiceInterface
  readonly #activityDomain: IActivityDomain

  constructor({
    config,
    userRepository,
    oauthAccountRepository,
    authDomain,
    postgresOrm,
    streakDomain,
    configService,
    activityDomain,
  }: IocContainer) {
    this.#config = config
    this.#userRepository = userRepository
    this.#oauthAccountRepository = oauthAccountRepository
    this.#authDomain = authDomain
    this.#postgresOrm = postgresOrm
    this.#streakDomain = streakDomain
    this.#configService = configService
    this.#activityDomain = activityDomain
  }

  getAuthorizationUrl(
    provider: OAuthProviderName,
    state: string,
    mode: OAuthMode,
  ): string {
    if (provider === 'google') {
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
        {
          client_id: this.#config.googleClientId,
          redirect_uri: this.#config.googleRedirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          state,
          // Force the consent screen on sign-up and on account linking; let
          // returning users through the default (silent) flow on login.
          ...(mode !== 'login' ? { prompt: 'consent' } : {}),
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
        // Sign-up and account linking must show the consent screen; login
        // attempts silent auth and falls back to consent via the callback
        // on access_denied.
        prompt: mode !== 'login' ? 'consent' : 'none',
      })}`
    }
    throw Boom.badRequest(errorMessage('auth.unknownProvider'))
  }

  async handleCallback(
    provider: OAuthProviderName,
    code: string,
    linkUserId?: string,
  ): Promise<{
    user: UserEntity
    tokens: TokenPair
    isNew: boolean
    linked: boolean
  }> {
    const userInfo =
      provider === 'google'
        ? await this.#fetchGoogleUser(code)
        : await this.#fetchDiscordUser(code)

    if (linkUserId) {
      const user = await this.linkGuest(linkUserId, provider, userInfo)
      const tokens = await this.#authDomain.generateTokenPair(user)
      return { user, tokens, isNew: false, linked: true }
    }

    const prismaProvider =
      provider === 'google' ? OAuthProvider.GOOGLE : OAuthProvider.DISCORD
    const existingAccount = await this.#oauthAccountRepository.findByProvider(
      prismaProvider,
      userInfo.id,
    )

    if (existingAccount) {
      const user = await this.#userRepository.findById(existingAccount.userId)
      if (!user) {
        throw Boom.notFound(errorMessage('user.notFound'))
      }
      try {
        await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
          await this.#streakDomain.updateStreak(user.id, tx)
        })
      } catch (err) {
        console.error('[StreakDomain] updateStreak failed:', err)
      }
      const tokens = await this.#authDomain.generateTokenPair(user)
      return { user, tokens, isNew: false, linked: false }
    }

    let user = await this.#userRepository.findByEmail(userInfo.email)
    let isNew = false

    if (!user) {
      const username = await this.#availableUsername(userInfo.username)
      const tokenMaxStock = await this.#configService.get('tokenMaxStock')
      // Même raisonnement que `auth.domain.ts#register` : la locale du
      // callback OAuth (résolue par le hook de tâche 4, ici depuis
      // l'`Accept-Language` que le navigateur envoie en revenant de
      // Google/Discord) est le seul signal disponible sur la langue de ce
      // nouveau compte — second et dernier chemin de création d'utilisateur
      // dans `src/main` (voir `userRepository.create(` — 2 call sites).
      user = await this.#userRepository.create({
        username,
        email: userInfo.email,
        tokens: tokenMaxStock,
        locale: getCurrentLocale(),
      })
      isNew = true
    }

    const resolvedUser = user

    await this.#oauthAccountRepository.create(
      resolvedUser.id,
      prismaProvider,
      userInfo.id,
    )
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        await this.#streakDomain.updateStreak(resolvedUser.id, tx)
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }
    const tokens = await this.#authDomain.generateTokenPair(resolvedUser)
    return { user: resolvedUser, tokens, isNew, linked: false }
  }

  /**
   * Rattache un compte OAuth à un invité : plus jamais de fusion ni de
   * liaison automatique par email (règle du plan). Un email déjà possédé
   * bloque — sauf s'il s'agit d'une inscription par mot de passe jamais
   * vérifiée et dont le jeton a expiré (même règle que
   * `GuestDomain#requestEmailUpgrade` / `AuthDomain#convertGuest`) : cette
   * ligne est éphémère et cède la place. Un compte créé par OAuth
   * (`passwordHash === null`) n'a jamais `emailVerifiedAt` ni de jeton — il
   * doit bloquer quand même, d'où le test explicite sur `passwordHash`.
   */
  async linkGuest(
    guestId: string,
    provider: OAuthProviderName,
    info: { id: string; email: string },
  ): Promise<UserEntity> {
    const guest = await this.#userRepository.findById(guestId)
    if (!guest || guest.role !== 'GUEST') {
      throw Boom.forbidden(errorMessage('auth.guestOnly'))
    }
    const prismaProvider =
      provider === 'google' ? OAuthProvider.GOOGLE : OAuthProvider.DISCORD
    const email = info.email.toLowerCase()
    const [linked, owner] = await Promise.all([
      this.#oauthAccountRepository.findByProvider(prismaProvider, info.id),
      this.#userRepository.findByEmail(email),
    ])
    if (linked) {
      throw new OAuthLinkConflictError()
    }
    if (owner) {
      const tokenPending =
        !!owner.emailVerificationTokenExpiresAt &&
        owner.emailVerificationTokenExpiresAt > new Date()
      const blocks =
        owner.emailVerifiedAt !== null ||
        owner.passwordHash === null ||
        tokenPending
      if (blocks) {
        throw new OAuthLinkConflictError()
      }
      await this.#userRepository.deleteUnverifiedByEmail(email)
    }
    const user = await this.#userRepository.update(guest.id, {
      email,
      role: 'USER',
    })
    await this.#oauthAccountRepository.create(user.id, prismaProvider, info.id)
    void this.#activityDomain.record('GUEST_CONVERTED', {
      userId: user.id,
      username: user.username,
      payload: { method: prismaProvider },
    })
    return user
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
      throw Boom.badGateway(errorMessage('auth.oauthTokenExchangeFailed'))
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }
    const userRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    )
    if (!userRes.ok) {
      throw Boom.badGateway(errorMessage('auth.oauthUserinfoFailed'))
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
      throw Boom.badGateway(errorMessage('auth.oauthTokenExchangeFailed'))
    }
    const tokenData = (await tokenRes.json()) as { access_token: string }
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (!userRes.ok) {
      throw Boom.badGateway(errorMessage('auth.oauthUserinfoFailed'))
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
