import type { Locale } from '../../../infra/i18n/locale'
import type { UpdateUserInput, UserEntity } from './user.types'

export interface UserDomainInterface {
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  findByUsername(username: string): Promise<UserEntity | null>
  update(id: string, input: UpdateUserInput): Promise<UserEntity>
  updateUsername(id: string, username: string): Promise<UserEntity>
  updateLocale(id: string, locale: Locale): Promise<UserEntity>
}
