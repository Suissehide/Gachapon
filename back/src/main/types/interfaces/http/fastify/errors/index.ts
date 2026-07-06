export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
  [key: string]: unknown
}

export type ErrorNormalizer = (
  error: unknown,
) => Partial<ErrorResponse> | undefined
