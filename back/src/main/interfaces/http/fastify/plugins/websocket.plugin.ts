import websocket from '@fastify/websocket'
import type { FastifyPluginAsync } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

const websocketPlugin: FastifyPluginAsync = fastifyPlugin(async (fastify) => {
  await fastify.register(websocket)
})

export { websocketPlugin }
