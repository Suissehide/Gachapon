import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { wsManager } from '../../../../ws/ws-manager'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const wsRouter: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/ws', { websocket: true }, async (socket, request) => {
    try {
      await fastify.verifySessionCookie(request)
    } catch {
      socket.send(
        JSON.stringify({ type: 'error', message: 'Unauthorized' }),
        () => {
          socket.close()
        },
      )
      return
    }

    const userId = request.user.userID
    wsManager.register(userId, socket)
    socket.send(JSON.stringify({ type: 'connected', userId }))
  })
}
