export interface JwtServiceInterface {
  sign(payload: Record<string, unknown>, options: { expiresIn: string }): string
  signRefresh(
    payload: Record<string, unknown>,
    options: { expiresIn: string },
  ): string
  verify<T>(token: string): T
  verifyRefresh<T>(token: string): T
}
