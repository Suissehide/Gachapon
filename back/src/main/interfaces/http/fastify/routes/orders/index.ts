import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { OrdersBoard } from '../../../../../types/domain/orders/orders.domain.interface'
import {
  deliverOrderBodySchema,
  orderIdParamSchema,
} from '../../schemas/orders.schema'

// Fonctionnalité solo : PAS de forbidGuest (spec 2026-10-02).
export const ordersRouter: FastifyPluginCallbackZod = (fastify) => {
  const { ordersDomain, storageClient } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  const resolveBoard = (board: OrdersBoard): OrdersBoard => ({
    ...board,
    slots: board.slots.map((s) =>
      s.order
        ? {
            ...s,
            order: {
              ...s.order,
              client: {
                ...s.order.client,
                imageUrl: resolveUrl(s.order.client.imageUrl),
              },
              lines: s.order.lines.map((l) => ({
                ...l,
                candidates: l.candidates.map((c) => ({
                  ...c,
                  imageUrl: resolveUrl(c.imageUrl),
                })),
              })),
            },
          }
        : s,
    ),
  })

  fastify.get(
    '/orders',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Get the customer order counter (generates due orders)',
      },
    },
    async (request) =>
      resolveBoard(await ordersDomain.list(request.user.userID)),
  )

  fastify.post(
    '/orders/:orderId/deliver',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Deliver duplicate cards to fulfil an order',
        params: orderIdParamSchema,
        body: deliverOrderBodySchema,
      },
    },
    async (request) =>
      ordersDomain.deliver(
        request.user.userID,
        request.params.orderId,
        request.body.picks,
      ),
  )

  fastify.post(
    '/orders/:orderId/dismiss',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { summary: 'Dismiss an open order', params: orderIdParamSchema },
    },
    async (request) =>
      ordersDomain.dismiss(request.user.userID, request.params.orderId),
  )
}
