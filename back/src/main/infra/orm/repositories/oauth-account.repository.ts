import type { OAuthAccount, OAuthProvider } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { PostgresPrismaClient } from '../postgres-client'

export class OAuthAccountRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByProvider(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<OAuthAccount | null> {
    return this.#prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    })
  }

  create(
    userId: string,
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<OAuthAccount> {
    return this.createInTx(this.#prisma, userId, provider, providerAccountId)
  }

  createInTx(
    tx: PrimaTransactionClient,
    userId: string,
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<OAuthAccount> {
    return tx.oAuthAccount.create({
      data: { userId, provider, providerAccountId },
    })
  }
}
