import { type Cradle, diContainer } from '@fastify/awilix'
import { type AwilixContainer, asClass, asValue } from 'awilix'
import type { Resolver } from 'awilix/lib/resolvers'
import { HttpClient } from '../../../infra/http/http-client'
import { PinoLogger } from '../../../infra/logger/pino/pino-logger'
import { PostgresOrm } from '../../../infra/orm/postgres-client'
import { RedisClient } from '../../../infra/redis/redis-client'
import { MinioClient } from '../../../infra/storage/minio-client'
import { FastifyHttpServer } from '../../../interfaces/http/fastify/fastify-http-server'
import type { Config } from '../../../types/application/config'
import type { IocContainer } from '../../../types/application/ioc'
import { ErrorHandler } from '../../../utils/error-handler'
import { recordToString } from '../../../utils/helper'

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
    this.#reg('minioClient', asClass(MinioClient).singleton())
    logger.info('IoC container initialized.')
  }

  #reg<T>(key: keyof IocContainer, resolver: Resolver<T>): AwilixContainer<Cradle> {
    return diContainer.register(key as string, resolver)
  }
}

export { AwilixIocContainer }
