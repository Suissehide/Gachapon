import Boom from '@hapi/boom'
import jwt, { type SignOptions } from 'jsonwebtoken'

import type { IocContainer } from '../../types/application/ioc'
import type { JwtServiceInterface } from '../../types/infra/auth/jwt.service'

export class JwtService implements JwtServiceInterface {
  readonly #secret: string
  readonly #refreshSecret: string

  constructor({ config }: IocContainer) {
    this.#secret = config.jwtSecret
    this.#refreshSecret = config.jwtRefreshSecret
  }

  sign(
    payload: Record<string, unknown>,
    options: { expiresIn: string },
  ): string {
    return jwt.sign(payload, this.#secret, options as SignOptions)
  }

  signRefresh(
    payload: Record<string, unknown>,
    options: { expiresIn: string },
  ): string {
    return jwt.sign(payload, this.#refreshSecret, options as SignOptions)
  }

  verify<T>(token: string): T {
    try {
      return jwt.verify(token, this.#secret) as T
    } catch {
      throw Boom.unauthorized('Invalid or expired token')
    }
  }

  verifyRefresh<T>(token: string): T {
    try {
      return jwt.verify(token, this.#refreshSecret) as T
    } catch {
      throw Boom.unauthorized('Invalid or expired refresh token')
    }
  }
}
