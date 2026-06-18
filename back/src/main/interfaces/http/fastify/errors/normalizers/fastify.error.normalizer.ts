import type { FastifyError } from 'fastify'

import type {
  ErrorNormalizer,
  ErrorResponse,
} from '../../../../../types/interfaces/http/fastify/errors'

const isFastifyError = (error: unknown): error is FastifyError => {
  const fastifyError = error as Partial<FastifyError>
  return (
    typeof fastifyError.code === 'string' &&
    typeof fastifyError.name === 'string' &&
    typeof fastifyError.statusCode === 'number'
  )
}

// fastify-type-provider-zod attaches a $ZodError under `cause` for response
// serialisation failures. Surface its issues in the error message so the
// logs tell us which path/field broke instead of just
// "Response doesn't match the schema".
const describeZodCause = (error: FastifyError): string => {
  const cause = (error as FastifyError & { cause?: unknown }).cause
  if (!cause || typeof cause !== 'object') {
    return error.message
  }
  const issues = (cause as { issues?: unknown }).issues
  if (!Array.isArray(issues)) {
    return error.message
  }
  const summary = issues
    .map((issue) => {
      const path = Array.isArray((issue as { path?: unknown[] }).path)
        ? (issue as { path: unknown[] }).path.join('.')
        : '(root)'
      const msg = (issue as { message?: string }).message ?? 'invalid'
      const code = (issue as { code?: string }).code ?? 'invalid'
      return `${path || '(root)'}: ${msg} [${code}]`
    })
    .join(' · ')
  return `${error.message} — ${summary}`
}

const fastifyErrorNormalizer: ErrorNormalizer = (
  error: unknown,
): Partial<ErrorResponse> | undefined => {
  if (!isFastifyError(error)) {
    return undefined
  }
  return {
    error: error.code,
    message:
      error.code === 'FST_ERR_RESPONSE_SERIALIZATION'
        ? describeZodCause(error)
        : error.message,
    statusCode: error.statusCode,
  }
}

export { fastifyErrorNormalizer, isFastifyError }
