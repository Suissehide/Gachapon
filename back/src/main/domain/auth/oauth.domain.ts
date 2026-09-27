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
import { classifyEmailOwner } from './email-ownership'

export type OAuthLinkErrorReason = 'account_exists' | 'email_unverified'

/** Conflit de liaison : l'appelant redirige vers `?link_error=<reason>`. */
export class OAuthLinkConflictError extends Error {
  readonly reason: OAuthLinkErrorReason

  constructor(reason: OAuthLinkErrorReason = 'account_exists') {
    super(`OAUTH_LINK_CONFLICT:${reason}`)
    this.name = 'OAuthLinkConflictError'
    this.reason = reason
  }
}

/**
 * Connexion/inscription OAuth refusée : le fournisseur ne garantit pas
 * l'email. L'appelant redirige vers `?oauth_error=email_unverified`.
 */
export class OAuthEmailUnverifiedError extends Error {
  readonly reason = 'email_unverified'

  constructor() {
    super(errorMessage('auth.oauthEmailUnverified'))
    this.name = 'OAuthEmailUnverifiedError'
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
      // Une adresse absente ou non confirmée côté fournisseur ne doit
      // jamais atterrir dans `email` : l'invité reste GUEST plutôt que
      // d'hériter d'une adresse qu'il ne possède pas forcément.
      if (!userInfo.email || !userInfo.emailVerified) {
        throw new OAuthLinkConflictError('email_unverified')
      }
      const user = await this.linkGuest(linkUserId, provider, {
        id: userInfo.id,
        email: userInfo.email,
        emailVerified: userInfo.emailVerified,
      })
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
      await this.#touchStreak(user.id)
      const tokens = await this.#authDomain.generateTokenPair(user)
      return { user, tokens, isNew: false, linked: false }
    }

    const { user, isNew } = await this.#findOrCreateByVerifiedEmail(userInfo)
    await this.#oauthAccountRepository.create(
      user.id,
      prismaProvider,
      userInfo.id,
    )
    await this.#touchStreak(user.id)
    const tokens = await this.#authDomain.generateTokenPair(user)
    return { user, tokens, isNew, linked: false }
  }

  /**
   * Chemin login/register sans OAuthAccount existant : le compte se
   * rattache par email, ou naît de cet email. Les deux supposent que le
   * fournisseur garantit l'adresse : sans ça, n'importe qui pourrait
   * déclarer chez Discord l'email d'autrui (non vérifié) et prendre son
   * compte ici. Discord peut aussi renvoyer `email: null`.
   */
  async #findOrCreateByVerifiedEmail(
    userInfo: OAuthUserInfo,
  ): Promise<{ user: UserEntity; isNew: boolean }> {
    if (!userInfo.email || !userInfo.emailVerified) {
      throw new OAuthEmailUnverifiedError()
    }

    const existing = await this.#userRepository.findByEmail(userInfo.email)
    if (existing) {
      if (existing.emailVerifiedAt !== null || existing.passwordHash === null) {
        return { user: existing, isNew: false }
      }
      // Inscription par mot de passe jamais confirmée : le fournisseur vient
      // de prouver l'adresse, le compte devient vérifié. Le mot de passe, lui,
      // n'a jamais été prouvé par le propriétaire de l'email (quelqu'un a pu
      // pré-créer ce compte avec l'adresse d'autrui) : on l'efface plutôt
      // que de lui ouvrir la porte. « Mot de passe oublié » le recrée.
      const verified = await this.#userRepository.update(existing.id, {
        emailVerifiedAt: new Date(),
        passwordHash: null,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      })
      return { user: verified, isNew: false }
    }

    const username = await this.#availableUsername(userInfo.username)
    const tokenMaxStock = await this.#configService.get('tokenMaxStock')
    // Même raisonnement que `auth.domain.ts#register` : la locale du
    // callback OAuth (résolue par le hook de tâche 4, ici depuis
    // l'`Accept-Language` que le navigateur envoie en revenant de
    // Google/Discord) est le seul signal disponible sur la langue de ce
    // nouveau compte — second et dernier chemin de création d'utilisateur
    // dans `src/main` (voir `userRepository.create(` — 2 call sites).
    const user = await this.#userRepository.create({
      username,
      email: userInfo.email,
      tokens: tokenMaxStock,
      locale: getCurrentLocale(),
    })
    return { user, isNew: true }
  }

  async #touchStreak(userId: string): Promise<void> {
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        await this.#streakDomain.updateStreak(userId, tx)
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }
  }

  /**
   * Rattache un compte OAuth à un invité : plus jamais de fusion ni de
   * liaison automatique par email (règle du plan). `classifyEmailOwner`
   * (partagée avec `register`/`requestEmailUpgrade`/`#convertGuest`) décide
   * du sort d'un email déjà présent — seule une ligne `stale` (inscription
   * par mot de passe jamais vérifiée, jeton expiré/absent) cède la place.
   * `emailVerified` : `undefined` vaut vérifié, pour ne pas casser les
   * appelants qui construisent `info` à la main (tests, appel direct) sans
   * connaître ce champ — seul `handleCallback` passe explicitement `false`.
   */
  async linkGuest(
    guestId: string,
    provider: OAuthProviderName,
    info: { id: string; email: string; emailVerified?: boolean },
  ): Promise<UserEntity> {
    const guest = await this.#userRepository.findById(guestId)
    if (!guest || guest.role !== 'GUEST') {
      throw Boom.forbidden(errorMessage('auth.guestOnly'))
    }
    if (info.emailVerified === false) {
      throw new OAuthLinkConflictError('email_unverified')
    }
    const prismaProvider =
      provider === 'google' ? OAuthProvider.GOOGLE : OAuthProvider.DISCORD
    const email = info.email.toLowerCase()
    const [linked, owner] = await Promise.all([
      this.#oauthAccountRepository.findByProvider(prismaProvider, info.id),
      this.#userRepository.findByEmail(email),
    ])
    if (linked) {
      throw new OAuthLinkConflictError('account_exists')
    }
    const status = classifyEmailOwner(owner)
    if (status === 'verified' || status === 'pending') {
      throw new OAuthLinkConflictError('account_exists')
    }
    // Une seule transaction : sans elle, un `create` qui échoue (P2002,
    // liaison concurrente du même compte fournisseur) laissait un USER sans
    // OAuthAccount. L'index unique (email, et provider+providerAccountId)
    // ferme la course restante : P2002 → conflit propre, jamais un 500.
    let user: UserEntity
    try {
      user = await this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          if (status === 'stale') {
            await this.#userRepository.deleteUnverifiedByEmailInTx(tx, email)
          }
          // L'email du fournisseur est vérifié : le compte l'est aussi. On
          // solde au passage une demande de conversion par email restée en
          // cours (`requestEmailUpgrade` a pu poser `passwordHash` + jeton) —
          // sinon ce USER, avec mot de passe mais sans `emailVerifiedAt`,
          // passerait `stale` à l'expiration du jeton et n'importe quel
          // `POST /auth/register` sur son email pourrait le supprimer.
          const updated = await this.#userRepository.updateInTx(tx, guest.id, {
            email,
            role: 'USER',
            emailVerifiedAt: new Date(),
            pendingEmail: null,
            emailVerificationToken: null,
            emailVerificationTokenExpiresAt: null,
          })
          await this.#oauthAccountRepository.createInTx(
            tx,
            updated.id,
            prismaProvider,
            info.id,
          )
          return updated
        },
      )
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new OAuthLinkConflictError('account_exists')
      }
      throw err
    }
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
      email: string | null
      verified_email?: boolean
      name: string
    }
    return {
      id: u.id,
      email: u.email ?? null,
      emailVerified: u.verified_email === true,
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
      email: string | null
      verified?: boolean
      username: string
    }
    return {
      id: u.id,
      email: u.email ?? null,
      emailVerified: u.verified === true,
      username: u.username,
    }
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
