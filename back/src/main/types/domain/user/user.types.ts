import type { User } from '../../../../generated/client'

export type UserEntity = User

export type CreateUserInput = {
  username: string
  email: string
  passwordHash?: string
}

export type UpdateUserInput = Partial<
  Pick<
    User,
    | 'username'
    | 'avatar'
    | 'banner'
    | 'tokens'
    | 'dust'
    | 'lastTokenAt'
    | 'xp'
    | 'level'
    | 'pityCurrent'
    | 'streakDays'
    | 'lastLoginAt'
    | 'role'
  >
>
