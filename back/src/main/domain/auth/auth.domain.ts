import Boom from '@hapi/boom'
import bcrypt from 'bcrypt'

import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { IocContainer } from '../../types/application/ioc'
import type { AuthDomainInterface } from '../../types/domain/auth/auth.domain.interface'
import type {
  JwtPayload,
  LoginInput,
  RegisterInput,
  TokenPair,
} from '../../types/domain/auth/auth.types'
import type { UserEntity } from '../../types/domain/user/user.types'
import type { JwtServiceInterface } from '../../types/infra/auth/jwt.service'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

const SALT_ROUNDS = 12

export class AuthDomain implements AuthDomainInterface {
  readonly #userRepository: UserRepositoryInterface
  readonly #refreshTokenRepository: RefreshTokenRepository
  readonly #jwtService: JwtServiceInterface

  constructor({
    userRepository,
    refreshTokenRepository,
    jwtService,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#refreshTokenRepository = refreshTokenRepository
    this.#jwtService = jwtService
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  async register(
    input: RegisterInput,
  ): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const existing = await this.#userRepository.findByEmail(input.email)
    if (existing) {
      throw Boom.conflict('Email already in use')
    }
    const existingUsername = await this.#userRepository.findByUsername(
      input.username,
    )
    if (existingUsername) {
      throw Boom.conflict('Username already taken')
    }
    const passwordHash = await this.hashPassword(input.password)
    const user = await this.#userRepository.create({
      username: input.username,
      email: input.email,
      passwordHash,
    })
    const tokens = await this.generateTokenPair(user)
    return { user, tokens }
  }

  async login(
    input: LoginInput,
  ): Promise<{ user: UserEntity; tokens: TokenPair }> {
    const user = await this.#userRepository.findByEmail(input.email)
    if (!user || !user.passwordHash) {
      // Constant-time comparison to prevent timing attacks
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
    const tokens = await this.generateTokenPair(user)
    return { user, tokens }
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
