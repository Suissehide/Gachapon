import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  equipmentEquipBodySchema,
  equipmentEquipResponseSchema,
  equipmentIdParamSchema,
  equipmentListResponseSchema,
  equipmentSalvageBodySchema,
  equipmentSalvageResponseSchema,
  equipmentUnequipResponseSchema,
  equipmentUpgradeResponseSchema,
} from '../../schemas/equipment.schema'

export const equipmentRouter: FastifyPluginCallbackZod = (fastify) => {
  const { equipmentDomain } = fastify.iocContainer

  fastify.get(
    '/equipment',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: equipmentListResponseSchema } },
    },
    (request) => equipmentDomain.listUserEquipment(request.user.userID),
  )

  fastify.post(
    '/equipment/:userEquipmentId/equip',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: equipmentIdParamSchema,
        body: equipmentEquipBodySchema,
        response: { 200: equipmentEquipResponseSchema },
      },
    },
    (request) =>
      equipmentDomain.equip(
        request.user.userID,
        request.params.userEquipmentId,
        request.body.targetUserCardId,
      ),
  )

  fastify.post(
    '/equipment/:userEquipmentId/unequip',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: equipmentIdParamSchema,
        response: { 200: equipmentUnequipResponseSchema },
      },
    },
    (request) =>
      equipmentDomain.unequip(
        request.user.userID,
        request.params.userEquipmentId,
      ),
  )

  fastify.post(
    '/equipment/:userEquipmentId/upgrade',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: equipmentIdParamSchema,
        response: { 200: equipmentUpgradeResponseSchema },
      },
    },
    (request) =>
      equipmentDomain.upgrade(
        request.user.userID,
        request.params.userEquipmentId,
      ),
  )

  fastify.post(
    '/equipment/salvage',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: equipmentSalvageBodySchema,
        response: { 200: equipmentSalvageResponseSchema },
      },
    },
    (request) =>
      equipmentDomain.salvage(
        request.user.userID,
        request.body.userEquipmentIds,
      ),
  )
}
