import type { IocContainer } from '../../../types/application/ioc'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '../../../types/domain/user/user.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  PullUpdateInput,
  UserRepositoryInterface,
} from '../../../types/infra/orm/repositories/user.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserRepository implements UserRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { email } })
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { username } })
  }

  create(input: CreateUserInput): Promise<UserEntity> {
    return this.#prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
      },
    })
  }

  update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    return this.#prisma.user.update({ where: { id }, data: input })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.user.delete({ where: { id } })
  }

  findByIdOrThrowInTx(
    tx: PrimaTransactionClient,
    id: string,
  ): Promise<UserEntity> {
    return tx.user.findUniqueOrThrow({ where: { id } })
  }

  async updateAfterPullInTx(
    tx: PrimaTransactionClient,
    id: string,
    data: PullUpdateInput,
  ): Promise<void> {
    await tx.user.update({
      where: { id },
      data: {
        tokens: data.tokens,
        dust: { increment: data.dustIncrement },
        pityCurrent: data.pityCurrent,
        lastTokenAt: data.lastTokenAt,
      },
    })
  }

  findByEmailVerificationToken(token: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { emailVerificationToken: token } })
  }

  findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { passwordResetToken: token } })
  }

  async deleteUnverifiedByEmail(email: string): Promise<void> {
    await this.#prisma.user.deleteMany({
      where: { email, emailVerifiedAt: null },
    })
  }
}
