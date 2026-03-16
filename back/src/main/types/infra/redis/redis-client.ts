import type Redis from 'ioredis'

export interface RedisClientInterface {
  readonly client: Redis
  healthCheck(): Promise<boolean>
  get(key: string): Promise<string | null>
  set(key: string, value: string | number, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
}
