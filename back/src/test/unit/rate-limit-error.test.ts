import { describe, expect, it } from '@jest/globals'

import { normalizeResponse } from '../../main/interfaces/http/fastify/errors/error.handler'
import { boomErrorNormalizer } from '../../main/interfaces/http/fastify/errors/normalizers/boom.error.normalizer'
import { fastifyErrorNormalizer } from '../../main/interfaces/http/fastify/errors/normalizers/fastify.error.normalizer'
import { prismaErrorNormalizer } from '../../main/interfaces/http/fastify/errors/normalizers/prisma.error.normalizer'
import { rateLimitErrorResponseBuilder } from '../../main/interfaces/http/fastify/plugins/rate-limit.plugin'

const normalizers = [
  prismaErrorNormalizer,
  fastifyErrorNormalizer,
  boomErrorNormalizer,
]

describe('rateLimitErrorResponseBuilder', () => {
  it('produit un 429 après normalisation (pas un 500)', () => {
    const error = rateLimitErrorResponseBuilder({
      statusCode: 429,
      after: '26 seconds',
      ban: false,
    })
    const response = normalizeResponse(error, normalizers)
    expect(response.statusCode).toBe(429)
    expect(response.message).toContain('retry in 26 seconds')
  })

  it('produit un 403 en cas de ban', () => {
    const error = rateLimitErrorResponseBuilder({
      statusCode: 403,
      after: '60 seconds',
      ban: true,
    })
    const response = normalizeResponse(error, normalizers)
    expect(response.statusCode).toBe(403)
  })
})
