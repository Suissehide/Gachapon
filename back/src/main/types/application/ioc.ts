import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { ApiKeyRepository } from '../../infra/orm/repositories/api-key.repository'
import type { CardRepository } from '../../infra/orm/repositories/card.repository'
import type { GachaPullRepository } from '../../infra/orm/repositories/gacha-pull.repository'
import type { OAuthAccountRepository } from '../../infra/orm/repositories/oauth-account.repository'
import type { UserCardRepository } from '../../infra/orm/repositories/user-card.repository'
import type { RefreshTokenRepository } from '../../infra/redis/refresh-token.repository'
import type { AuthDomainInterface } from '../domain/auth/auth.domain.interface'
import type { OAuthDomainInterface } from '../domain/auth/oauth.domain.interface'
import type { GachaDomainInterface } from '../domain/gacha/gacha.domain.interface'
import type { UserDomainInterface } from '../domain/user/user.domain.interface'
import type { JwtServiceInterface } from '../infra/auth/jwt.service'
import type { HttpClientInterface } from '../infra/http/http-client'
import type { UserRepositoryInterface } from '../infra/orm/repositories/user.repository.interface'
import type { RedisClientInterface } from '../infra/redis/redis-client'
import type { MinioClientInterface } from '../infra/storage/minio-client'
import type { HttpServer } from '../interfaces/http/server'
import type { ErrorHandlerInterface } from '../utils/error-handler'
import type { Logger } from '../utils/logger'
import type { Config } from './config'

export interface IocContainer {
  readonly config: Config
  readonly httpServer: HttpServer
  readonly httpClient: HttpClientInterface
  readonly logger: Logger
  readonly errorHandler: ErrorHandlerInterface
  readonly postgresOrm: PostgresOrm
  readonly redisClient: RedisClientInterface
  readonly minioClient: MinioClientInterface
  readonly jwtService: JwtServiceInterface
  readonly userRepository: UserRepositoryInterface
  readonly userDomain: UserDomainInterface
  readonly authDomain: AuthDomainInterface
  readonly oauthDomain: OAuthDomainInterface
  readonly refreshTokenRepository: RefreshTokenRepository
  readonly oauthAccountRepository: OAuthAccountRepository
  readonly apiKeyRepository: ApiKeyRepository
  readonly cardRepository: CardRepository
  readonly userCardRepository: UserCardRepository
  readonly gachaPullRepository: GachaPullRepository
  readonly gachaDomain: GachaDomainInterface
}
