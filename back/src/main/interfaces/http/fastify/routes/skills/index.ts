import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { nodeIdParamSchema } from '../../schemas/skills.schema'

export const skillsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { skillTreeDomain, skillInvestDomain, skillResetDomain } = fastify.iocContainer

  fastify.get(
    '/skills',
    { onRequest: [fastify.verifySessionCookie] },
    (request) => skillTreeDomain.getState(request.user.userID),
  )

  fastify.post(
    '/skills/:nodeId/invest',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: nodeIdParamSchema },
    },
    (request) => skillInvestDomain.invest(request.user.userID, request.params.nodeId),
  )

  fastify.post(
    '/skills/reset',
    { onRequest: [fastify.verifySessionCookie] },
    (request) => skillResetDomain.reset(request.user.userID),
  )
}
