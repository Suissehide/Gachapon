import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { TOWER_SLOT_BY_ELEMENT } from '../../../../../domain/tower/tower-slots'
import {
  towerBattleResponseSchema,
  towerElementParamSchema,
  towerFloorParamSchema,
  towerSweepBodySchema,
  towerSweepResponseSchema,
  towersResponseSchema,
  towerViewResponseSchema,
} from '../../schemas/tower.schema'

export const towerRouter: FastifyPluginCallbackZod = (fastify) => {
  const { towerDomain } = fastify.iocContainer

  fastify.get(
    '/tower',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'List elemental towers and progress',
        response: { 200: towersResponseSchema },
      },
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
        summary: 'Get an elemental tower with its floors',
        params: towerElementParamSchema,
        response: { 200: towerViewResponseSchema },
      },
    },
    (request) =>
      towerDomain.getTower(request.user.userID, request.params.element),
  )

  fastify.post(
    '/tower/:element/:floor/sweep',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Sweep a cleared tower floor',
        params: towerFloorParamSchema,
        body: towerSweepBodySchema,
        response: { 200: towerSweepResponseSchema },
      },
    },
    (request) =>
      towerDomain.sweepFloor(
        request.user.userID,
        request.params.element,
        request.params.floor,
        request.body.runs,
      ),
  )

  fastify.post(
    '/tower/:element/:floor/battle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Fight a tower floor',
        params: towerFloorParamSchema,
        response: { 200: towerBattleResponseSchema },
      },
    },
    (request) =>
      towerDomain.fight(
        request.user.userID,
        request.params.element,
        request.params.floor,
      ),
  )
}
