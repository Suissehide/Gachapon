import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  equipmentEquipBodySchema,
  equipmentEquipResponseSchema,
  equipmentIdParamSchema,
  equipmentListResponseSchema,
  equipmentSalvageBodySchema,
  equipmentSalvageResponseSchema,
  equipmentSetsResponseSchema,
  equipmentUnequipResponseSchema,
  equipmentUpgradeResponseSchema,
} from '../../schemas/equipment.schema'

export const equipmentRouter: FastifyPluginCallbackZod = (fastify) => {
  const { equipmentDomain } = fastify.iocContainer

  fastify.get(
    '/equipment',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: "List the user's equipment",
        response: { 200: equipmentListResponseSchema },
      },
    },
    (request) => equipmentDomain.listUserEquipment(request.user.userID),
  )

  // Donnée de référence publique, comme /economy/config — pas de session requise.
  fastify.get(
    '/equipment/sets',
    {
      schema: {
        summary: 'List equipment sets and their bonuses',
        response: { 200: equipmentSetsResponseSchema },
      },
    },
    () => equipmentDomain.listSets(),
  )

  fastify.post(
    '/equipment/:userEquipmentId/equip',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Equip a piece of equipment on a card',
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
        summary: 'Unequip a piece of equipment',
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
        summary: 'Upgrade a piece of equipment',
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
        summary: 'Salvage equipment pieces',
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
