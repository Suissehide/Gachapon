import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const teamsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { teamDomain } = fastify.iocContainer

  // GET /teams — mes équipes
  fastify.get(
    '/teams',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const teams = await teamDomain.getMyTeams(request.user.userID)
      return { teams: teams.map(formatTeamSummary) }
    },
  )

  // POST /teams — créer une équipe
  fastify.post(
    '/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: z.object({
          name: z.string().min(2).max(50),
          description: z.string().max(200).optional(),
        }),
      },
    },
    async (request, reply) => {
      const team = await teamDomain.createTeam(
        request.user.userID,
        request.body,
      )
      return reply.status(201).send(formatTeam(team))
    },
  )

  // GET /teams/:id — détail équipe
  fastify.get(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const team = await teamDomain.getTeam(
        request.params.id,
        request.user.userID,
      )
      return formatTeam(team)
    },
  )

  // DELETE /teams/:id — supprimer une équipe (owner only)
  fastify.delete(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      await teamDomain.deleteTeam(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )

  // POST /teams/:id/invite — inviter un membre
  fastify.post(
    '/teams/:id/invite',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z
          .object({
            username: z.string().optional(),
            email: z.string().email().optional(),
          })
          .refine((b) => b.username || b.email, {
            message: 'Provide username or email',
          }),
      },
    },
    async (request, reply) => {
      const invitation = await teamDomain.inviteMember(
        request.params.id,
        request.user.userID,
        request.body,
      )
      return reply.status(201).send({
        id: invitation.id,
        token: invitation.token,
        teamId: invitation.teamId,
        expiresAt: invitation.expiresAt,
      })
    },
  )

  // GET /invitations/:token — voir une invitation
  fastify.get(
    '/invitations/:token',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ token: z.string().uuid() }) },
    },
    async (request) => {
      const { invitationRepository } = fastify.iocContainer
      const inv = await invitationRepository.findByToken(request.params.token)
      if (!inv) {
        throw Boom.notFound('Invitation not found')
      }
      return {
        id: inv.id,
        token: inv.token,
        teamId: inv.teamId,
        status: inv.status,
        expiresAt: inv.expiresAt,
      }
    },
  )

  // POST /invitations/:token/accept — accepter
  fastify.post(
    '/invitations/:token/accept',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ token: z.string().uuid() }) },
    },
    async (request) => {
      await teamDomain.acceptInvitation(
        request.params.token,
        request.user.userID,
      )
      return { accepted: true }
    },
  )

  // POST /invitations/:token/decline — décliner
  fastify.post(
    '/invitations/:token/decline',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ token: z.string().uuid() }) },
    },
    async (request) => {
      await teamDomain.declineInvitation(
        request.params.token,
        request.user.userID,
      )
      return { declined: true }
    },
  )

  // POST /teams/:id/members/:userId/remove — exclure un membre
  fastify.post(
    '/teams/:id/members/:userId/remove',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await teamDomain.removeMember(
        request.params.id,
        request.user.userID,
        request.params.userId,
      )
      return reply.status(204).send()
    },
  )

  // POST /teams/:id/leave — quitter une équipe
  fastify.post(
    '/teams/:id/leave',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request, reply) => {
      await teamDomain.leaveTeam(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )

  // POST /teams/:id/transfer — transférer la propriété
  fastify.post(
    '/teams/:id/transfer',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ newOwnerId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      await teamDomain.transferOwnership(
        request.params.id,
        request.user.userID,
        request.body.newOwnerId,
      )
      return reply.status(204).send()
    },
  )
}

// Helpers de sérialisation
function formatMember(m: any) {
  return {
    id: m.id,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    user: m.user
      ? { id: m.user.id, username: m.user.username, avatar: m.user.avatar }
      : undefined,
  }
}

function formatTeam(team: any) {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    avatar: team.avatar,
    ownerId: team.ownerId,
    createdAt: team.createdAt,
    members: team.members?.map(formatMember) ?? [],
  }
}

function formatTeamSummary(team: any) {
  return {
    ...formatTeam(team),
    memberCount: team._count?.members ?? team.members?.length ?? 0,
  }
}
