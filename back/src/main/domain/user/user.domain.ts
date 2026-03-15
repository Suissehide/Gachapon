import type { IocContainer } from '../../types/application/ioc.js'
import type { UserDomainInterface } from '../../types/domain/user/user.domain.interface.js'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface.js'
import type { UserEntity, UpdateUserInput } from '../../types/domain/user/user.types.js'

export class UserDomain implements UserDomainInterface {
  readonly #repo: UserRepositoryInterface

  constructor({ userRepository }: IocContainer) {
    this.#repo = userRepository
  }

  findById(id: string): Promise<UserEntity | null> { return this.#repo.findById(id) }
  findByEmail(email: string): Promise<UserEntity | null> { return this.#repo.findByEmail(email) }
  findByUsername(username: string): Promise<UserEntity | null> { return this.#repo.findByUsername(username) }
  update(id: string, input: UpdateUserInput): Promise<UserEntity> { return this.#repo.update(id, input) }
}
