import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { UserDomainInterface } from '../../types/domain/user/user.domain.interface'
import type {
  UpdateUserInput,
  UserEntity,
} from '../../types/domain/user/user.types'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

export class UserDomain implements UserDomainInterface {
  readonly #repo: UserRepositoryInterface

  constructor({ userRepository }: IocContainer) {
    this.#repo = userRepository
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.#repo.findById(id)
  }
  findByEmail(email: string): Promise<UserEntity | null> {
    return this.#repo.findByEmail(email)
  }
  findByUsername(username: string): Promise<UserEntity | null> {
    return this.#repo.findByUsername(username)
  }
  update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    return this.#repo.update(id, input)
  }

  async updateUsername(id: string, username: string): Promise<UserEntity> {
    const current = await this.#repo.findById(id)
    if (!current) {
      throw Boom.notFound('Utilisateur introuvable')
    }
    if (current.username === username) {
      return current
    }
    const taken = await this.#repo.findByUsername(username)
    if (taken) {
      throw Boom.conflict('Ce pseudo est déjà pris')
    }
    return this.#repo.update(id, { username })
  }
}
