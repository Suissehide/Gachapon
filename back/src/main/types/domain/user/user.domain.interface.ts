import type { UpdateUserInput, UserEntity } from './user.types'

export interface UserDomainInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
}
