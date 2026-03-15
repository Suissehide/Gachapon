import type { PostgresPrismaClient } from '../postgres-client.js'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { UserRepositoryInterface } from '../../../types/infra/orm/repositories/user.repository.interface.js'
import type { CreateUserInput, UpdateUserInput, UserEntity } from '../../../types/domain/user/user.types.js'

export class UserRepository implements UserRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.#prisma.user.findUnique({ where: { username } })
  }

  create(input: CreateUserInput): Promise<UserEntity> {
    return this.#prisma.user.create({
      data: {
        username: input.username,
        email: input.email.toLowerCase().trim(),
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
}
