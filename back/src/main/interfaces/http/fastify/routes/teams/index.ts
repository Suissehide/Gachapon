import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { calculateUserScore } from '../../../../../domain/scoring/scoring.domain'
import type { TeamPerkKey } from '../../../../../domain/team-progression/team-progression-rules'
import { errorMessage } from '../../../../../infra/i18n/error-messages'
import type { TeamPerkState } from '../../../../../types/domain/team-progression/team-progression.domain.interface'
import type { TeamPerkEvent } from '../../../../ws/ws-manager'
import {
  directoryQuerySchema,
  directoryResponseSchema,
  joinRequestDecisionResponseSchema,
  joinRequestIdParamSchema,
  myJoinRequestSchema,
  myJoinRequestsResponseSchema,
  teamJoinRequestsResponseSchema,
} from '../../schemas/recruitment.schema'
import {
  teamCreateBodySchema,
  teamDetailResponseSchema,
  teamIdParamSchema,
  teamInvitationIdParamSchema,
  teamInviteBodySchema,
  teamListResponseSchema,
  teamMemberRoleUpdateBodySchema,
  teamMembersResponseSchema,
  teamPerkSpendBodySchema,
  teamPerksResponseSchema,
  teamRaidHistoryResponseSchema,
  teamRankingQuerySchema,
  teamResponseSchema,
  teamTokenParamSchema,
  teamTransferBodySchema,
  teamUpdateBodySchema,
  teamUserIdParamSchema,
} from '../../schemas/teams.schema'

export const teamsRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    teamDomain,
    teamProgressionDomain,
    teamProgressionRepository,
    wsManager,
    scoringConfigRepository,
    userCardRepository,
    recruitmentDomain,
  } = fastify.iocContainer

  /**
   * Pousse un `team:perk` par bonus touché, à CHAQUE membre de l'équipe —
   * jamais `broadcast` : un rang de bonus ne regarde que cette équipe.
   * Strictement APRÈS commit : les deux appelants reçoivent une vue déjà
   * sortie de sa transaction.
   *
   * Une seule fonction pour la dépense et la remise à zéro, parce que la
   * remise à zéro n'émettait rien du tout tant qu'elle avait son propre
   * chemin.
   */
  async function notifyPerkChange(
    teamId: string,
    view: { teamId: string; perkPoints: number; perks: TeamPerkState[] },
    keys: TeamPerkKey[],
  ): Promise<void> {
    if (keys.length === 0) {
      return
    }
    const memberIds =
      await teamProgressionRepository.listMemberIdsForTeam(teamId)
    for (const key of keys) {
      const event: TeamPerkEvent = {
        type: 'team:perk',
        teamId: view.teamId,
        // Le NOUVEAU rang, lu dans la vue rendue par le domaine — jamais
        // recalculé ici.
        rank: view.perks.find((perk) => perk.key === key)?.rank ?? 0,
        key,
        perkPoints: view.perkPoints,
      }
      for (const memberId of memberIds) {
        wsManager.notify(memberId, event)
      }
    }
  }

  fastify.get(
    '/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { tags: ['Team'], response: { 200: teamListResponseSchema } },
    },
    async (request) => ({
      teams: await teamDomain.listMyTeams(request.user.userID),
    }),
  )

  fastify.post(
    '/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        body: teamCreateBodySchema,
        response: { 201: teamResponseSchema },
      },
    },
    async (request, reply) => {
      const team = await teamDomain.createTeam(
        request.user.userID,
        request.body,
      )
      return reply.status(201).send(team)
    },
  )

  // Doit être déclarée AVANT `/teams/:id` : sinon Fastify résout
  // `directory` comme un `:id` et le schéma UUID de ce paramètre rejette la
  // requête en 400.
  fastify.get(
    '/teams/directory',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        querystring: directoryQuerySchema,
        response: { 200: directoryResponseSchema },
      },
    },
    (request) =>
      recruitmentDomain.listDirectory(request.user.userID, request.query),
  )

  fastify.get(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        response: { 200: teamDetailResponseSchema },
      },
    },
    (request) =>
      teamDomain.getTeamDetail(request.params.id, request.user.userID),
  )

  fastify.get(
    '/teams/:id/members',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        response: { 200: teamMembersResponseSchema },
      },
    },
    (request) => teamDomain.listMembers(request.params.id, request.user.userID),
  )

  fastify.get(
    '/teams/:id/raids',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        response: { 200: teamRaidHistoryResponseSchema },
      },
    },
    async (request) => ({
      raids: await teamDomain.listRaidHistory(
        request.params.id,
        request.user.userID,
      ),
    }),
  )

  fastify.post(
    '/teams/:id/join-requests',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        response: { 201: myJoinRequestSchema },
      },
    },
    async (request, reply) => {
      const created = await recruitmentDomain.apply(
        request.params.id,
        request.user.userID,
      )

      // Notification strictement après le commit de `apply` : personne ne
      // doit apprendre une candidature qui finirait par échouer (plafond,
      // équipe déjà rejointe, etc.). `request.user` ne porte que
      // `{ userID, role }` (voir jwt.plugin.ts) : le pseudo se relit ici.
      const { teamRepository, userRepository } = fastify.iocContainer
      const [team, candidate] = await Promise.all([
        teamRepository.findById(created.teamId),
        userRepository.findById(request.user.userID),
      ])
      if (team && candidate) {
        // `getTeamDetail` exige d'être membre de l'équipe ; le candidat qui
        // vient de postuler ne l'est justement pas. `findById` inclut déjà
        // `members` sans cette contrainte.
        for (const member of team.members) {
          if (member.role !== 'MEMBER') {
            wsManager.notify(member.userId, {
              type: 'team:join-request',
              teamId: created.teamId,
              requestId: created.id,
              candidate: { id: candidate.id, username: candidate.username },
            })
          }
        }
      }

      return reply.status(201).send(created)
    },
  )

  fastify.delete(
    '/teams/:id/join-requests/me',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { tags: ['Team'], params: teamIdParamSchema },
    },
    async (request, reply) => {
      await recruitmentDomain.cancel(request.params.id, request.user.userID)
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/teams/:id/join-requests',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        response: { 200: teamJoinRequestsResponseSchema },
      },
    },
    async (request) => ({
      requests: await recruitmentDomain.listForTeam(
        request.params.id,
        request.user.userID,
      ),
    }),
  )

  fastify.get(
    '/me/join-requests',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        response: { 200: myJoinRequestsResponseSchema },
      },
    },
    async (request) => ({
      requests: await recruitmentDomain.listMine(request.user.userID),
    }),
  )

  fastify.post(
    '/join-requests/:id/accept',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: joinRequestIdParamSchema,
        response: { 200: joinRequestDecisionResponseSchema },
      },
    },
    async (request) => {
      const { teamId, userId, teamName } = await recruitmentDomain.accept(
        request.params.id,
        request.user.userID,
      )
      // Après commit uniquement : au seul candidat, jamais à l'équipe — la
      // décision ne regarde que lui.
      wsManager.notify(userId, {
        type: 'team:join-decision',
        teamId,
        teamName,
        status: 'ACCEPTED',
      })
      return { teamId, userId }
    },
  )

  fastify.post(
    '/join-requests/:id/decline',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: joinRequestIdParamSchema,
        response: { 200: joinRequestDecisionResponseSchema },
      },
    },
    async (request) => {
      const { teamId, userId, teamName } = await recruitmentDomain.decline(
        request.params.id,
        request.user.userID,
      )
      wsManager.notify(userId, {
        type: 'team:join-decision',
        teamId,
        teamName,
        status: 'DECLINED',
      })
      return { teamId, userId }
    },
  )

  fastify.patch(
    '/teams/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Team'],
        params: teamIdParamSchema,
        body: teamUpdateBodySchema,
        response: { 200: teamResponseSchema },
      },
    },
    (request) =>
      teamDomain.updateTeam(
        request.params.id,
        request.user.userID,
        request.body,
      ),
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
      // 403 si le compte connecté n'est pas le destinataire — la lecture est
      // gardée comme l'écriture, sinon le front affiche le nom de l'équipe et
      // un bouton « Rejoindre » à quelqu'un qui n'entrera jamais.
      const inv = await teamDomain.getInvitationForRecipient(
        request.params.token,
        request.user.userID,
      )
      return {
        id: inv.id,
        token: inv.token,
        teamId: inv.teamId,
        status: inv.status,
        expiresAt: inv.expiresAt,
        team: inv.team,
        invitedBy: inv.invitedBy,
      }
    },
  )

  fastify.get(
    '/me/invitations',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const { invitationRepository, userRepository } = fastify.iocContainer
      const me = await userRepository.findById(request.user.userID)
      if (!me) {
        throw Boom.notFound(errorMessage('user.notFound'))
      }
      const invitations = await invitationRepository.findPendingForUser(
        me.id,
        me.email,
      )
      return {
        invitations: invitations.map((inv) => ({
          id: inv.id,
          token: inv.token,
          teamId: inv.teamId,
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          team: inv.team,
          invitedBy: inv.invitedBy,
        })),
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
      await teamDomain.acceptInvitation(
        request.params.token,
        request.user.userID,
      )
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
      await teamDomain.declineInvitation(
        request.params.token,
        request.user.userID,
      )
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
      await teamDomain.removeMember(
        request.params.id,
        request.user.userID,
        request.params.userId,
      )
      return reply.status(204).send()
    },
  )

  fastify.patch(
    '/teams/:id/members/:userId/role',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: teamUserIdParamSchema,
        body: teamMemberRoleUpdateBodySchema,
      },
    },
    async (request, reply) => {
      await teamDomain.changeMemberRole(
        request.params.id,
        request.user.userID,
        request.params.userId,
        request.body.role,
      )
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
      if (!team) {
        throw Boom.notFound(errorMessage('team.notFound'))
      }
      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role === 'MEMBER') {
        throw Boom.forbidden(errorMessage('team.onlyAdminOrOwner'))
      }

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
          status:
            inv.status === 'PENDING' && inv.expiresAt < now
              ? 'EXPIRED'
              : inv.status,
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
      await teamDomain.resendInvitationEmail(
        request.params.token,
        request.user.userID,
      )
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
      if (!inv) {
        throw Boom.notFound(errorMessage('team.invitationNotFound'))
      }

      const team = await teamRepository.findById(inv.teamId)
      if (!team) {
        throw Boom.notFound(errorMessage('team.notFound'))
      }

      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role !== 'OWNER') {
        throw Boom.forbidden(errorMessage('team.onlyOwnerCanCancelInvitation'))
      }
      if (inv.status !== 'PENDING') {
        throw Boom.conflict(errorMessage('team.invitationNotPending'))
      }

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
      if (!inv) {
        throw Boom.notFound(errorMessage('team.invitationNotFound'))
      }

      const team = await teamRepository.findById(inv.teamId)
      if (!team) {
        throw Boom.notFound(errorMessage('team.notFound'))
      }

      const actor = team.members.find((m) => m.userId === request.user.userID)
      if (!actor || actor.role !== 'OWNER') {
        throw Boom.forbidden(errorMessage('team.onlyOwnerCanDeleteInvitation'))
      }

      const isExpired = inv.status === 'PENDING' && inv.expiresAt < new Date()
      if (inv.status === 'PENDING' && !isExpired) {
        throw Boom.conflict(errorMessage('team.cancelInvitationBeforeDeleting'))
      }

      await invitationRepository.deleteById(request.params.id)
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/teams/:id/ranking',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: teamIdParamSchema,
        querystring: teamRankingQuerySchema,
      },
    },
    async (request) => {
      const { id } = request.params
      const { page, limit } = request.query

      // `getTeamAsMember` : cette route rend le pseudo, l'avatar, le rôle
      // et le score de collection de CHAQUE membre. C'est la même catégorie
      // de donnée que le roster, et une invitation — que n'importe quel
      // officier peut émettre — n'ouvre pas le détail des membres.
      const team = await teamDomain.getTeamAsMember(id, request.user.userID)
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
          if (b.score !== a.score) {
            return b.score - a.score
          }
          return (a.member.user?.username ?? '').localeCompare(
            b.member.user?.username ?? '',
          )
        })

      const total = scored.length
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit
      const paginated = scored.slice(offset, offset + limit)

      return {
        members: paginated.map((entry, i) => ({
          rank: offset + i + 1,
          user: entry.member.user
            ? {
                id: entry.member.user.id,
                username: entry.member.user.username,
                avatar: entry.member.user.avatar,
              }
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

  fastify.post(
    '/teams/:id/perks',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: teamIdParamSchema,
        body: teamPerkSpendBodySchema,
        response: { 200: teamPerksResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params
      const { key } = request.body
      const view = await teamProgressionDomain.spendPerkPoint(
        id,
        request.user.userID,
        key,
      )
      // Un seul rang a bougé : un seul événement.
      await notifyPerkChange(id, view, [key])
      return view
    },
  )

  fastify.post(
    '/teams/:id/perks/reset',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: teamIdParamSchema,
        response: { 200: teamPerksResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params
      const view = await teamProgressionDomain.resetPerks(
        id,
        request.user.userID,
      )
      // La remise à zéro touche les QUATRE rangs d'un coup : sans ces
      // événements, les autres membres gardaient à l'écran des rangs et un
      // quota d'attaques périmés — juste après une opération dont la
      // confirmation leur promet qu'ils perdent immédiatement les effets.
      await notifyPerkChange(
        id,
        view,
        view.perks.map((perk) => perk.key),
      )
      return view
    },
  )
}
