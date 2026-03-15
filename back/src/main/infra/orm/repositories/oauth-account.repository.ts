import type { OAuthProvider, OAuthAccount } from '../../../../generated/client.js'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { PostgresPrismaClient } from '../postgres-client.js'

export class OAuthAccountRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount | null> {
    return this.#prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    })
  }

  create(userId: string, provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount> {
    return this.#prisma.oAuthAccount.create({ data: { userId, provider, providerAccountId } })
  }
}
