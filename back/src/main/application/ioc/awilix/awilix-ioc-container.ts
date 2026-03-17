import { type Cradle, diContainer } from '@fastify/awilix'
import { type AwilixContainer, asClass, asValue } from 'awilix'
import type { Resolver } from 'awilix/lib/resolvers'

import { AuthDomain } from '../../../domain/auth/auth.domain'
import { OAuthDomain } from '../../../domain/auth/oauth.domain'
import { GachaDomain } from '../../../domain/gacha/gacha.domain'
import { TeamDomain } from '../../../domain/team/team.domain'
import { UserDomain } from '../../../domain/user/user.domain'
import { JwtService } from '../../../infra/auth/jwt.service'
import { HttpClient } from '../../../infra/http/http-client'
import { PinoLogger } from '../../../infra/logger/pino/pino-logger'
import { PostgresOrm } from '../../../infra/orm/postgres-client'
import { ApiKeyRepository } from '../../../infra/orm/repositories/api-key.repository'
import { CardRepository } from '../../../infra/orm/repositories/card.repository'
import { GachaPullRepository } from '../../../infra/orm/repositories/gacha-pull.repository'
import { InvitationRepository } from '../../../infra/orm/repositories/invitation.repository'
import { OAuthAccountRepository } from '../../../infra/orm/repositories/oauth-account.repository'
import { TeamRepository } from '../../../infra/orm/repositories/team.repository'
import { TeamMemberRepository } from '../../../infra/orm/repositories/team-member.repository'
import { UserRepository } from '../../../infra/orm/repositories/user.repository'
import { UserCardRepository } from '../../../infra/orm/repositories/user-card.repository'
import { RedisClient } from '../../../infra/redis/redis-client'
import { RefreshTokenRepository } from '../../../infra/redis/refresh-token.repository'
import { ConfigService } from '../../../infra/config/config.service'
import { MinioClient } from '../../../infra/storage/minio-client'
import { FastifyHttpServer } from '../../../interfaces/http/fastify/fastify-http-server'
import type { IocContainer } from '../../../types/application/ioc'
import { ErrorHandler } from '../../../utils/error-handler'
import { recordToString } from '../../../utils/helper'
import type { Config } from '../../config'

declare module '@fastify/awilix' {
  interface Cradle extends IocContainer {}
}

class AwilixIocContainer {
  get instances() {
    return diContainer.cradle
  }

  constructor(config: Config) {
    this.#reg('config', asValue(config))
    const container = this.#reg('logger', asClass(PinoLogger).singleton())
    const logger = container.resolve('logger')
    logger.debug('Initializing IoC container…')
    logger.debug(`Loaded config:\n\t${recordToString(config)}`)
    this.#reg('postgresOrm', asClass(PostgresOrm).singleton())
    this.#reg('httpServer', asClass(FastifyHttpServer).singleton())
    this.#reg('httpClient', asClass(HttpClient).singleton())
    this.#reg('errorHandler', asClass(ErrorHandler).singleton())
    this.#reg('redisClient', asClass(RedisClient).singleton())
    this.#reg('configService', asClass(ConfigService).singleton())
    this.#reg('minioClient', asClass(MinioClient).singleton())
    this.#reg('jwtService', asClass(JwtService).singleton())
    this.#reg('userRepository', asClass(UserRepository).singleton())
    this.#reg('userDomain', asClass(UserDomain).singleton())
    this.#reg(
      'refreshTokenRepository',
      asClass(RefreshTokenRepository).singleton(),
    )
    this.#reg(
      'oauthAccountRepository',
      asClass(OAuthAccountRepository).singleton(),
    )
    this.#reg('apiKeyRepository', asClass(ApiKeyRepository).singleton())
    this.#reg('authDomain', asClass(AuthDomain).singleton())
    this.#reg('oauthDomain', asClass(OAuthDomain).singleton())
    this.#reg('cardRepository', asClass(CardRepository).singleton())
    this.#reg('userCardRepository', asClass(UserCardRepository).singleton())
    this.#reg('gachaPullRepository', asClass(GachaPullRepository).singleton())
    this.#reg('gachaDomain', asClass(GachaDomain).singleton())
    this.#reg('teamRepository', asClass(TeamRepository).singleton())
    this.#reg('teamMemberRepository', asClass(TeamMemberRepository).singleton())
    this.#reg('invitationRepository', asClass(InvitationRepository).singleton())
    this.#reg('teamDomain', asClass(TeamDomain).singleton())
    logger.info('IoC container initialized.')
  }

  #reg<T>(
    key: keyof IocContainer,
    resolver: Resolver<T>,
  ): AwilixContainer<Cradle> {
    return diContainer.register(key as string, resolver)
  }
}

export { AwilixIocContainer }
