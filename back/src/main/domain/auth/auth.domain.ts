import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import bcrypt from 'bcrypt'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { IocContainer } from '../../types/application/ioc'
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

  constructor({
    userRepository,
    refreshTokenRepository,
    jwtService,
    mailService,
    postgresOrm,
    streakDomain,
    configService,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#refreshTokenRepository = refreshTokenRepository
    this.#jwtService = jwtService
    this.#mailService = mailService
    this.#postgresOrm = postgresOrm
    this.#streakDomain = streakDomain
    this.#configService = configService
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
      throw Boom.conflict('Email already in use')
    }
    // If unverified account exists with expired token, delete it
    if (existing && !existing.emailVerifiedAt) {
      const expiresAt = existing.emailVerificationTokenExpiresAt
      if (expiresAt && expiresAt > new Date()) {
        throw Boom.conflict(
          'Un compte est en attente de vérification pour cet email',
        )
      }
      await this.#userRepository.deleteUnverifiedByEmail(input.email)
    }

    const existingUsername = await this.#userRepository.findByUsername(
      input.username,
    )
    if (existingUsername) {
      throw Boom.conflict('Username already taken')
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

    await this.#userRepository.update(user.id, {
      emailVerificationToken: token,
      emailVerificationTokenExpiresAt: expiresAt,
    })

    await this.#mailService.sendVerificationEmail(input.email, token)

    return { email: input.email }
  }

  async login(
    input: LoginInput,
  ): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const user = await this.#userRepository.findByEmail(input.email)
    if (!user || !user.passwordHash) {
      await bcrypt.compare(
        input.password,
        '$2b$12$invalidhashfortimingsafety.00000000000000000000000000U',
      )
      throw Boom.unauthorized('Invalid credentials')
    }
    const valid = await this.verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      throw Boom.unauthorized('Invalid credentials')
    }
    if (!user.emailVerifiedAt) {
      throw Boom.forbidden('EMAIL_NOT_VERIFIED')
    }
    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        await this.#streakDomain.updateStreak(user.id, tx)
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }
    const tokens = await this.generateTokenPair(user)
    return { user, tokens }
  }

  async verifyEmail(
    token: string,
  ): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const user = await this.#userRepository.findByEmailVerificationToken(token)
    if (!user) {
      throw Boom.badRequest('Token invalide ou expiré')
    }
    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw Boom.badRequest('Token invalide ou expiré')
    }

    const verified = await this.#userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
    })

    try {
      await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
        await this.#streakDomain.updateStreak(verified.id, tx)
      })
    } catch (err) {
      console.error('[StreakDomain] updateStreak failed:', err)
    }

    const tokens = await this.generateTokenPair(verified)
    return { user: verified, tokens }
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
        throw Boom.tooManyRequests(
          'Veuillez patienter avant de renvoyer un email',
          { retryAfterSeconds },
        )
      }
    }

    const newToken = randomUUID()
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

    await this.#userRepository.update(user.id, {
      emailVerificationToken: newToken,
      emailVerificationTokenExpiresAt: expiresAt,
    })

    await this.#mailService.sendVerificationEmail(email, newToken)
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
        throw Boom.tooManyRequests(
          'Veuillez patienter avant de renvoyer un email',
          { retryAfterSeconds },
        )
      }
    }

    const resetToken = randomUUID()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await this.#userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetTokenExpiresAt: expiresAt,
    })

    await this.#mailService.sendPasswordResetEmail(email, resetToken)
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.#userRepository.findByPasswordResetToken(token)
    if (!user) {
      throw Boom.badRequest('Token invalide ou expiré')
    }
    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw Boom.badRequest('Token invalide ou expiré')
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
      throw Boom.unauthorized('Refresh token revoked')
    }
    const user = await this.#userRepository.findById(payload.sub)
    if (!user) {
      throw Boom.unauthorized('User not found')
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
      expiresIn: '7d',
    })
    await this.#refreshTokenRepository.store(user.id, refreshToken)
    return { accessToken, refreshToken }
  }
}
