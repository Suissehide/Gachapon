import type { IocContainer } from '../../types/application/ioc'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'

const TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export class RefreshTokenRepository {
  readonly #redis: RedisClientInterface

  constructor({ redisClient }: IocContainer) {
    this.#redis = redisClient
  }

  #key(userId: string, token: string): string {
    return `refresh:${userId}:${token}`
  }

  async store(userId: string, token: string): Promise<void> {
    await this.#redis.client.set(this.#key(userId, token), '1', 'EX', TTL)
  }

  async exists(userId: string, token: string): Promise<boolean> {
    return (await this.#redis.client.get(this.#key(userId, token))) !== null
  }

  async revoke(userId: string, token: string): Promise<void> {
    await this.#redis.client.del(this.#key(userId, token))
  }

  async revokeAll(userId: string): Promise<void> {
    const keys = await this.#redis.client.keys(`refresh:${userId}:*`)
    if (keys.length > 0) {
      await this.#redis.client.del(...keys)
    }
  }
}
