import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { TOWER_SLOT_BY_ELEMENT } from '../../../../../domain/tower/tower-slots'
import {
  towerBattleBodySchema,
  towerBattleResponseSchema,
  towerElementParamSchema,
  towerFloorParamSchema,
  towersResponseSchema,
  towerViewResponseSchema,
} from '../../schemas/tower.schema'

export const towerRouter: FastifyPluginCallbackZod = (fastify) => {
  const { towerDomain } = fastify.iocContainer

  fastify.get(
    '/tower',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: towersResponseSchema } },
    },
    async (request) => {
      const towers = await towerDomain.listTowers(request.user.userID)
      return {
        towers: towers.map((tower) => ({
          ...tower,
          slot: TOWER_SLOT_BY_ELEMENT[tower.element],
        })),
      }
    },
  )

  fastify.get(
    '/tower/:element',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: towerElementParamSchema,
        response: { 200: towerViewResponseSchema },
      },
    },
    (request) =>
      towerDomain.getTower(request.user.userID, request.params.element),
  )

  fastify.post(
    '/tower/:element/:floor/battle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: towerFloorParamSchema,
        body: towerBattleBodySchema,
        response: { 200: towerBattleResponseSchema },
      },
    },
    (request) =>
      towerDomain.fight(
        request.user.userID,
        request.params.element,
        request.params.floor,
        request.body.userCardIds,
      ),
  )
}
