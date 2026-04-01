import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { calculateUserScore } from '../../../../../domain/scoring/scoring.domain'

import {
  teamCreateBodySchema,
  teamIdParamSchema,
  teamInvitationIdParamSchema,
  teamInviteBodySchema,
  teamRankingQuerySchema,
  teamTokenParamSchema,
  teamTransferBodySchema,
  teamUserIdParamSchema,
} from '../../schemas/teams.schema'

export const teamsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { teamDomain, scoringConfigRepository, userCardRepository } = fastify.iocContainer

  fastify.get(
    '/teams',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const teams = await teamDomain.getMyTeams(request.user.userID)
      return { teams: teams.map(formatTeamSummary) }
    },
  )

  fastify.post(
    '/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: teamCreateBodySchema },
    },
    async (request, reply) => {
      const team = await teamDomain.createTeam(request.user.userID, request.body)
      return reply.status(201).send(formatTeam(team))
    },
  )

  fastify.get(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema },
    },
    async (request) => {
      const team = await teamDomain.getTeam(request.params.id, request.user.userID)
      return formatTeam(team)
    },
  )

  fastify.delete(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema },
    },
    async (request, reply) => {
      await teamDomain.deleteTeam(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/teams/:id/invite',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema, body: teamInviteBodySchema },
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

  fastify.get(
    '/invitations/:token',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamTokenParamSchema },
    },
    async (request) => {
      const { invitationRepository } = fastify.iocContainer
      const inv = await invitationRepository.findByToken(request.params.token)
      if (!inv) throw Boom.notFound('Invitation not found')
      return {
        id: inv.id,
        token: inv.token,
        teamId: inv.teamId,
        status: inv.status,
        expiresAt: inv.expiresAt,
      }
    },
  )

  fastify.post(
    '/invitations/:token/accept',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamTokenParamSchema },
    },
    async (request) => {
      await teamDomain.acceptInvitation(request.params.token, request.user.userID)
      return { accepted: true }
    },
  )

  fastify.post(
    '/invitations/:token/decline',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamTokenParamSchema },
    },
    async (request) => {
      await teamDomain.declineInvitation(request.params.token, request.user.userID)
      return { declined: true }
    },
  )

  fastify.post(
    '/teams/:id/members/:userId/remove',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamUserIdParamSchema },
    },
    async (request, reply) => {
      await teamDomain.removeMember(request.params.id, request.user.userID, request.params.userId)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/teams/:id/leave',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema },
    },
    async (request, reply) => {
      await teamDomain.leaveTeam(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/teams/:id/transfer',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema, body: teamTransferBodySchema },
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

  fastify.get(
    '/teams/:id/invitations',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema },
    },
    async (request) => {
      const teamRepo = fastify.iocContainer.teamRepository
      const invitationRepo = fastify.iocContainer.invitationRepository
      const team = await teamRepo.findById(request.params.id)
      if (!team) throw Boom.notFound('Team not found')
      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role === 'MEMBER') throw Boom.forbidden('Only ADMIN or OWNER')

      const now = new Date()
      const invitations = await invitationRepo.findAllByTeam(request.params.id)
      return {
        invitations: invitations.map((inv) => ({
          id: inv.id,
          token: inv.token,
          invitedEmail: inv.invitedEmail,
          invitedUsername: inv.invitedUser?.username ?? null,
          createdAt: inv.createdAt,
          emailSentAt: inv.emailSentAt,
          expiresAt: inv.expiresAt,
          status: inv.status === 'PENDING' && inv.expiresAt < now ? 'EXPIRED' : inv.status,
        })),
      }
    },
  )

  fastify.post(
    '/invitations/:token/resend',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamTokenParamSchema },
    },
    async (request, reply) => {
      await teamDomain.resendInvitationEmail(request.params.token, request.user.userID)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/invitations/:token/cancel',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamTokenParamSchema },
    },
    async (request, reply) => {
      const { invitationRepository, teamRepository } = fastify.iocContainer
      const inv = await invitationRepository.findByToken(request.params.token)
      if (!inv) throw Boom.notFound('Invitation not found')

      const team = await teamRepository.findById(inv.teamId)
      if (!team) throw Boom.notFound('Team not found')

      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role !== 'OWNER') throw Boom.forbidden('Only OWNER can cancel an invitation')
      if (inv.status !== 'PENDING') throw Boom.conflict('Invitation is not PENDING')

      await invitationRepository.cancelById(inv.id)
      return reply.status(204).send()
    },
  )

  fastify.delete(
    '/invitations/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamInvitationIdParamSchema },
    },
    async (request, reply) => {
      const { invitationRepository, teamRepository } = fastify.iocContainer
      const inv = await invitationRepository.findById(request.params.id)
      if (!inv) throw Boom.notFound('Invitation not found')

      const team = await teamRepository.findById(inv.teamId)
      if (!team) throw Boom.notFound('Team not found')

      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role !== 'OWNER') throw Boom.forbidden('Only OWNER can delete an invitation')

      const isExpired = inv.status === 'PENDING' && inv.expiresAt < new Date()
      if (inv.status === 'PENDING' && !isExpired) throw Boom.conflict('Cancel the invitation before deleting it')

      await invitationRepository.deleteById(request.params.id)
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/teams/:id/ranking',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: teamIdParamSchema, querystring: teamRankingQuerySchema },
    },
    async (request) => {
      const { id } = request.params
      const { page, limit } = request.query

      const team = await teamDomain.getTeam(id, request.user.userID)
      const config = await scoringConfigRepository.get()

      const memberIds = team.members.map((m) => m.userId)
      const allUserCards = await userCardRepository.findForScoring(memberIds)

      const cardsByUser = new Map<string, typeof allUserCards>()
      for (const uc of allUserCards) {
        const list = cardsByUser.get(uc.userId) ?? []
        list.push(uc)
        cardsByUser.set(uc.userId, list)
      }

      const scored = team.members
        .map((m) => ({
          member: m,
          score: calculateUserScore(cardsByUser.get(m.userId) ?? [], config),
        }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return (a.member.user?.username ?? '').localeCompare(b.member.user?.username ?? '')
        })

      const total = scored.length
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit
      const paginated = scored.slice(offset, offset + limit)

      return {
        members: paginated.map((entry, i) => ({
          rank: offset + i + 1,
          user: entry.member.user
            ? { id: entry.member.user.id, username: entry.member.user.username, avatar: entry.member.user.avatar }
            : { id: entry.member.userId, username: 'Unknown', avatar: null },
          role: entry.member.role,
          score: entry.score,
        })),
        total,
        page,
        totalPages,
      }
    },
  )
}

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
