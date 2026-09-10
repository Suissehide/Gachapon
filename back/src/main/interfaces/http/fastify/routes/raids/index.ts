import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  raidAttackBodySchema,
  raidAttackResponseSchema,
  raidContributionsResponseSchema,
  raidTeamParamSchema,
  raidViewResponseSchema,
} from '../../schemas/raid.schema'

export const raidsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { raidDomain, teamProgressionDomain } = fastify.iocContainer

  fastify.get(
    '/teams/:id/raid',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        response: { 200: raidViewResponseSchema },
      },
    },
    (request) => raidDomain.getRaid(request.params.id, request.user.userID),
  )

  fastify.get(
    '/teams/:id/raid/contributions',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        response: { 200: raidContributionsResponseSchema },
      },
    },
    async (request) => ({
      contributions: await raidDomain.getContributions(
        request.params.id,
        request.user.userID,
      ),
    }),
  )

  fastify.post(
    '/teams/:id/raid/attack',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        body: raidAttackBodySchema,
        response: { 200: raidAttackResponseSchema },
      },
    },
    async (request) => {
      const result = await raidDomain.attack(
        request.params.id,
        request.user.userID,
        request.body.userCardIds,
      )

      // Crédite l'équipe DONT LE RAID A ÉTÉ ATTAQUÉ (l'URL, pas une notion
      // d'équipe « active ») des dégâts bruts infligés. `void` + `catch` :
      // un règlement de points en échec ne doit jamais transformer une
      // attaque réussie en erreur pour le joueur.
      void teamProgressionDomain
        .award(
          request.user.userID,
          request.params.id,
          'RAID_DAMAGE',
          result.damage,
        )
        .catch((err) =>
          fastify.log.error({ err }, 'team points failed'),
        )

      return result
    },
  )
}
