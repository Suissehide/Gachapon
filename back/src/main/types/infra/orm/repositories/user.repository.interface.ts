import type { CreateUserInput, UpdateUserInput, UserEntity } from '../../../domain/user/user.types.js'

export interface UserRepositoryInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  create(input: CreateUserInput): Promise<UserEntity>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
  delete(id: string): Promise<void>
}
