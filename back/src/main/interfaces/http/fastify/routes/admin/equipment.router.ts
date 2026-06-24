import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  adminGrantEquipmentBodySchema,
  adminGrantEquipmentResponseSchema,
} from '../../schemas/equipment.schema'

export const adminEquipmentRouter: FastifyPluginCallbackZod = (fastify) => {
  const { equipmentDomain } = fastify.iocContainer

  fastify.post(
    '/equipment/grant',
    {
      schema: {
        body: adminGrantEquipmentBodySchema,
        response: { 200: adminGrantEquipmentResponseSchema },
      },
    },
    (request) =>
      equipmentDomain.grantToUser(
        request.body.userId,
        request.body.equipmentId,
      ),
  )
}
