import type Redis from 'ioredis'

export interface RedisClientInterface {
  readonly client: Redis
  healthCheck(): Promise<boolean>
}
