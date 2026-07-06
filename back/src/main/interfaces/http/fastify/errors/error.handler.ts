import type { Boom } from '@hapi/boom'
import { html } from 'common-tags'
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import type {
  ErrorNormalizer,
  ErrorResponse,
} from '../../../../types/interfaces/http/fastify/errors'
import {
  defaultErrorResponse,
  errorNormalizer,
} from './normalizers/error.normalizer'

const normalizeResponse = (
  error: unknown,
  customErrorNormalizers: ErrorNormalizer[],
): ErrorResponse => {
  // Each normalizer receives the original error (not the accumulated output) so
  // an unrecognised plain object never leaks its own fields into the response.
  // First-match wins: once a normalizer produces output the rest are skipped,
  // which prevents the catch-all errorNormalizer from overwriting a richer
  // Boom/Fastify result that fired earlier in the chain.
  const override = [...customErrorNormalizers, errorNormalizer].reduce<
    Partial<ErrorResponse>
  >(
    (acc, normalizer) =>
      Object.keys(acc).length > 0 ? acc : (normalizer(error) ?? acc),
    {},
  )
  return { ...defaultErrorResponse, ...override }
}

const buildErrorHandler = (...errorNormalizers: ErrorNormalizer[]) => {
  return function (
    this: FastifyInstance,
    error: Boom | Error | FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ): string | ErrorResponse {
    this.log.debug(error)
    const errorResponse = normalizeResponse(error, errorNormalizers)
    this.log.error(`Error: ${JSON.stringify(errorResponse)}`)
    reply.status(errorResponse.statusCode)
    const accept = request.accepts()
    if (accept.type('json', 'html') === 'html') {
      reply.type('text/html')
      return html`
        <html lang="en">
          <body>
            <h2>${errorResponse.error}</h2>
            <h3>${errorResponse.message}</h3>
          </body>
        </html>
      `
    }
    return { ...errorResponse }
  }
}

export { buildErrorHandler, normalizeResponse }
