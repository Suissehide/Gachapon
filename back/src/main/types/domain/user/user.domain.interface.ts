import type { UserEntity, UpdateUserInput } from './user.types.js'

export interface UserDomainInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
}
