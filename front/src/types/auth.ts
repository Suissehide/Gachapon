export type User = {
  id: string
  username: string
  email: string
  role: Role
}

export type Role = 'NONE' | 'USER' | 'ADMIN'

export type AuthState = {
  isAuthenticated: boolean
  user: User | null
}

export type RegisterInput = {
  username: string
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

export type UpdateUserParams = {
  id: string
  username?: string
  email?: string
  role?: Role
}
