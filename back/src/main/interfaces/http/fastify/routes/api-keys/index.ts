import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const apiKeysRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { apiKeyRepository } = fastify.iocContainer

  fastify.post(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: z.object({ name: z.string().min(1).max(50) }) },
    },
    async (request, reply) => {
      const key = await apiKeyRepository.create(
        request.user.userID,
        request.body.name,
      )
      return reply.status(201).send({
        id: key.id,
        name: key.name,
        key: key.key,
        createdAt: key.createdAt,
      })
    },
  )

  fastify.get(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
    },
    async (request) => {
      const keys = await apiKeyRepository.findByUser(request.user.userID)
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }))
    },
  )

  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      await apiKeyRepository.delete(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )
}
