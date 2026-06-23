import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  battleResponseSchema,
  campaignResponseSchema,
  stageIdParamSchema,
  sweepBodySchema,
  sweepResponseSchema,
} from '../../schemas/campaign.schema'

export const campaignRouter: FastifyPluginCallbackZod = (fastify) => {
  const { campaignDomain } = fastify.iocContainer

  fastify.get(
    '/campaign',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: campaignResponseSchema } },
    },
    (request) => campaignDomain.getCampaign(request.user.userID),
  )

  fastify.post(
    '/campaign/stages/:stageId/battle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: stageIdParamSchema,
        response: { 200: battleResponseSchema },
      },
    },
    (request) =>
      campaignDomain.attackStage(request.user.userID, request.params.stageId),
  )

  fastify.post(
    '/campaign/stages/:stageId/sweep',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: stageIdParamSchema,
        body: sweepBodySchema,
        response: { 200: sweepResponseSchema },
      },
    },
    (request) =>
      campaignDomain.sweepStage(
        request.user.userID,
        request.params.stageId,
        request.body.runs,
      ),
  )
}
