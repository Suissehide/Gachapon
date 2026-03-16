import type { UserEntity } from '../user/user.types'
import type { LoginInput, RegisterInput, TokenPair } from './auth.types'

export interface AuthDomainInterface {
  register(
    input: RegisterInput,
  ): Promise<{ user: UserEntity; tokens: TokenPair }>
  login(input: LoginInput): Promise<{ user: UserEntity; tokens: TokenPair }>
  refreshTokens(refreshToken: string): Promise<TokenPair>
  logout(userId: string, refreshToken: string): Promise<void>
  hashPassword(password: string): Promise<string>
  verifyPassword(password: string, hash: string): Promise<boolean>
  generateTokenPair(user: UserEntity): Promise<TokenPair>
}
