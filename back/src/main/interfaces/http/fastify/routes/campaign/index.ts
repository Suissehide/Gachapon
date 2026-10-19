import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  battleResponseSchema,
  campaignResponseSchema,
  stageIdParamSchema,
  sweepBodySchema,
  sweepResponseSchema,
} from '../../schemas/campaign.schema'
import { wandererResponseSchema } from '../../schemas/wanderer.schema'

export const campaignRouter: FastifyPluginCallbackZod = (fastify) => {
  const { campaignDomain, wanderingMonsterDomain } = fastify.iocContainer

  fastify.get(
    '/campaign',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Get campaign chapters and progress',
        response: { 200: campaignResponseSchema },
      },
    },
    (request) => campaignDomain.getCampaign(request.user.userID),
  )

  fastify.get(
    '/campaign/wanderer',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Get the active wandering monster, if any',
        response: { 200: wandererResponseSchema },
      },
    },
    async (request) => ({
      wanderer: await wanderingMonsterDomain.findActive(
        request.user.userID,
        new Date(),
      ),
    }),
  )

  fastify.post(
    '/campaign/stages/:stageId/battle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Fight a campaign stage',
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
        summary: 'Sweep a cleared campaign stage',
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
