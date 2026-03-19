import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { wsManager } from '../../../../ws/ws-manager'

export const wsRouter: FastifyPluginCallbackZod = (fastify) => {
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
