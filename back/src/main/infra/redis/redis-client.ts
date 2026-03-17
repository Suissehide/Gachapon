import Redis from 'ioredis'

import type { IocContainer } from '../../types/application/ioc'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'

export class RedisClient implements RedisClientInterface {
  readonly client: Redis

  constructor({ config }: IocContainer) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
  }

  async healthCheck(): Promise<boolean> {
    return (await this.client.ping()) === 'PONG'
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string | number, ttlSeconds: number): Promise<void> {
    await this.client.set(String(key), String(value), 'EX', ttlSeconds)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }
}
