import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { HttpClientInterface } from '../infra/http/http-client'
import type { JwtServiceInterface } from '../infra/auth/jwt.service'
import type { RedisClientInterface } from '../infra/redis/redis-client'
import type { MinioClientInterface } from '../infra/storage/minio-client'
import type { UserRepositoryInterface } from '../infra/orm/repositories/user.repository.interface'
import type { UserDomainInterface } from '../domain/user/user.domain.interface'
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
}
