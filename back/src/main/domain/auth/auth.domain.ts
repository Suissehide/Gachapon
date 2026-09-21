import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import bcrypt from 'bcrypt'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { IocContainer } from '../../types/application/ioc'
import type { IActivityDomain } from '../../types/domain/activity/activity.domain.interface'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface'
import type {
  JwtPayload,
  LoginInput,
  RegisterInput,
  TokenPair,
} from '../../types/domain/auth/auth.types'
import type { StreakDomainInterface } from '../../types/domain/streak/streak.domain.interface'
import type { UserEntity } from '../../types/domain/user/user.types'
import type { JwtServiceInterface } from '../../types/infra/auth/jwt.service'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { UnlockedAchievement } from '../achievements/events.types'

const SALT_ROUNDS = 12
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1h
const COOLDOWN_MS = 2 * 60 * 1000 // 2 min

export class AuthDomain implements AuthDomainInterface {
  readonly #userRepository: UserRepositoryInterface
  readonly #refreshTokenRepository: RefreshTokenRepository
  readonly #jwtService: JwtServiceInterface
  readonly #mailService: IMailService
  readonly #postgresOrm: PostgresOrm
  readonly #streakDomain: StreakDomainInterface
  readonly #configService: ConfigServiceInterface
  readonly #activityDomain: IActivityDomain

  constructor({
    userRepository,
    refreshTokenRepository,
    jwtService,
    mailService,
    postgresOrm,
    streakDomain,
    configService,
    activityDomain,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#refreshTokenRepository = refreshTokenRepository
    this.#jwtService = jwtService
    this.#mailService = mailService
    this.#postgresOrm = postgresOrm
    this.#streakDomain = streakDomain
    this.#configService = configService
    this.#activityDomain = activityDomain
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  async register(input: RegisterInput): Promise<{ email: string }> {
    // Check for existing verified account
    const existing = await this.#userRepository.findByEmail(input.email)
    if (existing?.emailVerifiedAt) {
      throw Boom.conflict(errorMessage('auth.emailAlreadyInUse'))
    }
    // If unverified account exists with expired token, delete it
    if (existing && !existing.emailVerifiedAt) {
      const expiresAt = existing.emailVerificationTokenExpiresAt
      if (expiresAt && expiresAt > new Date()) {
        throw Boom.conflict(errorMessage('auth.unverifiedAccountPending'))
      }
      await this.#userRepository.deleteUnverifiedByEmail(input.email)
    }

    const existingUsername = await this.#userRepository.findByUsername(
      input.username,
    )
    if (existingUsername) {
      throw Boom.conflict(errorMessage('user.usernameTaken'))
    }

    const passwordHash = await this.hashPassword(input.password)
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

    const tokenMaxStock = await this.#configService.get('tokenMaxStock')
    const user = await this.#userRepository.create({
      username: input.username,
      email: input.email,
      passwordHash,
      tokens: tokenMaxStock,
    })

    void this.#activityDomain.record('USER_SIGNUP', {
      userId: user.id,
      username: user.username,
      payload: { username: user.username },
    })

    await this.#userRepository.update(user.id, {
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: expiresAt,
    })

    // `user` vient d'être créé : le mail part dans sa locale (celle du
    // destinataire), pas dans `getCurrentLocale()` (celle du navigateur qui
    // a déclenché l'inscription — le même compte ici, mais la règle est
    // uniforme dès qu'un `User` existe, voir task-7-brief.md).
    await this.#mailService.sendVerificationEmail(
      input.email,
      token,
      user.locale,
    )

    return { email: input.email }
  }

  async login(input: LoginInput): Promise<{
    user: UserEntity
    tokens: TokenPair
    unlockedAchievements: UnlockedAchievement[]
  }> {
    const user = await this.#userRepository.findByEmail(input.email)
    if (!user || !user.passwordHash) {
      await bcrypt.compare(
        input.password,
        '$2b$12$invalidhashfortimingsafety.00000000000000000000000000U',
      )
      throw Boom.unauthorized(errorMessage('auth.invalidCredentials'))
    }
    const valid = await this.verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      throw Boom.unauthorized(errorMessage('auth.invalidCredentials'))
    }
    if (!user.emailVerifiedAt) {
      throw Boom.forbidden(errorMessage('auth.emailNotVerified'))
    }
    let unlockedAchievements: UnlockedAchievement[] = []
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        unlockedAchievements = await this.#streakDomain.updateStreak(
          user.id,
          tx,
        )
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }
    const tokens = await this.generateTokenPair(user)
    return { user, tokens, unlockedAchievements }
  }

  async verifyEmail(token: string): Promise<{
    user: UserEntity
    tokens: TokenPair
    unlockedAchievements: UnlockedAchievement[]
  }> {
    const user = await this.#userRepository.findByEmailVerificationToken(token)
    if (!user) {
      throw Boom.badRequest(errorMessage('auth.invalidOrExpiredToken'))
    }
    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw Boom.badRequest(errorMessage('auth.invalidOrExpiredToken'))
    }

    const verified = await this.#userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    })

    let unlockedAchievements: UnlockedAchievement[] = []
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        unlockedAchievements = await this.#streakDomain.updateStreak(
          verified.id,
          tx,
        )
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }

    const tokens = await this.generateTokenPair(verified)
    return { user: verified, tokens, unlockedAchievements }
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.#userRepository.findByEmail(email)
    if (!user || user.emailVerifiedAt) {
      return // silent: don't leak info
    }

    // Cooldown: check if token was generated less than 2 min ago
    if (user.emailVerificationTokenExpiresAt) {
      const generatedAt = new Date(
        user.emailVerificationTokenExpiresAt.getTime() -
          VERIFICATION_TOKEN_TTL_MS,
      )
      if (Date.now() - generatedAt.getTime() < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (COOLDOWN_MS - (Date.now() - generatedAt.getTime())) / 1000,
        )
        throw Boom.tooManyRequests(errorMessage('auth.resendCooldown'), {
          retryAfterSeconds,
        })
      }
    }

    const newToken = randomUUID()
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

    await this.#userRepository.update(user.id, {
      emailVerificationToken: newToken,
      emailVerificationTokenExpiresAt: expiresAt,
    })

    // `user` est le destinataire — locale prise sur son compte.
    await this.#mailService.sendVerificationEmail(email, newToken, user.locale)
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.#userRepository.findByEmail(email)
    // Always return silently — don't leak if email exists or is OAuth-only
    if (!user || !user.passwordHash) {
      return
    }

    // Cooldown
    if (user.passwordResetTokenExpiresAt) {
      const generatedAt = new Date(
        user.passwordResetTokenExpiresAt.getTime() - RESET_TOKEN_TTL_MS,
      )
      if (Date.now() - generatedAt.getTime() < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
          (COOLDOWN_MS - (Date.now() - generatedAt.getTime())) / 1000,
        )
        throw Boom.tooManyRequests(errorMessage('auth.resendCooldown'), {
          retryAfterSeconds,
        })
      }
    }

    const resetToken = randomUUID()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await this.#userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetTokenExpiresAt: expiresAt,
    })

    // `user` est le destinataire — locale prise sur son compte, pas sur la
    // requête courante (voir la garde silencieuse plus haut : sans compte,
    // aucun mail ne part de toute façon, donc pas de cas « adresse
    // inconnue » à couvrir ici).
    await this.#mailService.sendPasswordResetEmail(
      email,
      resetToken,
      user.locale,
    )
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.#userRepository.findByPasswordResetToken(token)
    if (!user) {
      throw Boom.badRequest(errorMessage('auth.invalidOrExpiredToken'))
    }
    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw Boom.badRequest(errorMessage('auth.invalidOrExpiredToken'))
    }

    const passwordHash = await this.hashPassword(newPassword)

    await this.#userRepository.update(user.id, {
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
      passwordHash,
    })
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = this.#jwtService.verifyRefresh<JwtPayload>(refreshToken)
    const valid = await this.#refreshTokenRepository.exists(
      payload.sub,
      refreshToken,
    )
    if (!valid) {
      throw Boom.unauthorized(errorMessage('auth.refreshTokenRevoked'))
    }
    const user = await this.#userRepository.findById(payload.sub)
    if (!user) {
      throw Boom.unauthorized(errorMessage('user.notFound'))
    }
    await this.#refreshTokenRepository.revoke(payload.sub, refreshToken)
    return this.generateTokenPair(user)
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.#refreshTokenRepository.revoke(userId, refreshToken)
  }

  async generateTokenPair(user: UserEntity): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, role: user.role }
    const accessToken = this.#jwtService.sign(payload, { expiresIn: '15m' })
    const refreshToken = this.#jwtService.signRefresh(payload, {
      expiresIn: '30d',
    })
    await this.#refreshTokenRepository.store(user.id, refreshToken)
    return { accessToken, refreshToken }
  }
}
