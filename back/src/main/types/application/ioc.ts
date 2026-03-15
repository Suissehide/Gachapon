import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { HttpClientInterface } from '../infra/http/http-client'
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
}
