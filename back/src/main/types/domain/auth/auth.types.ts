export type TokenPair = {
  accessToken: string
  refreshToken: string
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

export type JwtPayload = {
  sub: string
  role: string
  iat?: number
  exp?: number
}
