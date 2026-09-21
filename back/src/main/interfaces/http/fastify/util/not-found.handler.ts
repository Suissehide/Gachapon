import Boom from '@hapi/boom'
import type { FastifyRequest } from 'fastify'

import { errorMessage } from '../errors/messages'

const notFoundHandler = (request: FastifyRequest): void => {
  const { method, url } = request
  throw Boom.notFound(errorMessage('http.routeNotFound', { method, url }), {
    method,
    url,
  })
}

export { notFoundHandler }
