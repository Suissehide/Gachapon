import Boom from '@hapi/boom'
import slugify from 'slugify'

import type { IocContainer } from '../../types/application/ioc'
import type { ILeaderboardDomain } from '../../types/domain/leaderboard/leaderboard.domain.interface'
import type { IRaidDomain } from '../../types/domain/raid/raid.domain.interface'
import type {
  InvitationPreview,
  TeamDomainInterface,
} from '../../types/domain/team/team.domain.interface'
import type {
  InvitationEntity,
  TeamDetail,
  TeamListItem,
  TeamMembersView,
  TeamMemberView,
  TeamWithMembers,
} from '../../types/domain/team/team.types'
import type { ITeamProgressionDomain } from '../../types/domain/team-progression/team-progression.domain.interface'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'
import type { IInvitationRepository } from '../../types/infra/orm/repositories/invitation.repository.interface'
import type { ITeamRepository } from '../../types/infra/orm/repositories/team.repository.interface'
import type { ITeamMemberRepository } from '../../types/infra/orm/repositories/team-member.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  hueFromName,
  roleLabel,
  xpForTeamLevel,
} from '../team-progression/team-progression-rules'

const MAX_TEAMS_PER_USER = 3
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000

/**
 * Teinte de l'équipe, TOUJOURS résolue. La colonne est nullable (aucune
 * équipe créée avant la refonte n'en porte) et `hueFromName` fournit un
 * repli stable et déterministe, testé unitairement. On la résout ici, en
 * sortie, pour qu'aucun consommateur n'ait à gérer un `null`.
 */
function resolveHue(team: { hue: number | null; name: string }): number {
  return team.hue ?? hueFromName(team.name)
}

// Défauts Prisma : 5 s pour le corps d'une transaction interactive, 2 s pour
// acquérir une connexion. La suppression d'une équipe déclenche une cascade
// qui emporte membres, invitations, raids, duels, paris et transferts : sur
// une grosse équipe, ni l'un ni l'autre ne suffit.
const DELETE_TX_TIMEOUT_MS = 30_000
const DELETE_TX_MAX_WAIT_MS = 10_000

/**
 * Message du refus. Il nomme ce qui bloque et ce qu'il faut attendre : le
 * propriétaire n'a rien à réparer, juste à laisser ses enjeux se conclure.
 */
function pendingWagersMessage(openBets: number, openDuels: number): string {
  const parts: string[] = []
  if (openBets > 0) {
    parts.push(`${openBets} pari${openBets > 1 ? 's' : ''}`)
  }
  if (openDuels > 0) {
    parts.push(`${openDuels} duel${openDuels > 1 ? 's' : ''}`)
  }
  return `Cette équipe a encore ${parts.join(' et ')} en cours : attends leur résolution avant de la supprimer. Une mise engagée ne peut pas être rendue, et les cartes d'un duel doivent revenir à son vainqueur.`
}

export class TeamDomain implements TeamDomainInterface {
  readonly #teamRepo: ITeamRepository
  readonly #memberRepo: ITeamMemberRepository
  readonly #invitationRepo: IInvitationRepository
  readonly #userRepo: UserRepositoryInterface
  readonly #postgresOrm: IocContainer['postgresOrm']
  readonly #mailService: IMailService
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #duelDomain: IDuelDomain
  readonly #configService: ConfigServiceInterface
  readonly #teamProgressionDomain: ITeamProgressionDomain
  readonly #raidDomain: IRaidDomain
  readonly #leaderboardDomain: ILeaderboardDomain

  constructor({
    teamRepository,
    teamMemberRepository,
    invitationRepository,
    userRepository,
    postgresOrm,
    mailService,
    achievementsDomain,
    duelDomain,
    configService,
    teamProgressionDomain,
    raidDomain,
    leaderboardDomain,
  }: IocContainer) {
    this.#teamRepo = teamRepository
    this.#memberRepo = teamMemberRepository
    this.#invitationRepo = invitationRepository
    this.#userRepo = userRepository
    this.#postgresOrm = postgresOrm
    this.#mailService = mailService
    this.#achievementsDomain = achievementsDomain
    this.#duelDomain = duelDomain
    this.#configService = configService
    this.#teamProgressionDomain = teamProgressionDomain
    this.#raidDomain = raidDomain
    this.#leaderboardDomain = leaderboardDomain
  }

  /**
   * Le plafond de membres, lu en config (`team.maxMembers`) et jamais figé
   * dans le code. Il ne borne QUE l'entrée dans une équipe — invitation et
   * acceptation. Une équipe déjà au-dessus du plafond (le plafond est passé
   * de 100 à 35) continue de fonctionner en tout point : on la lit, ses
   * membres jouent, son raid tourne. Aucune lecture ne doit se mettre à le
   * vérifier, sous peine de casser les équipes existantes.
   */
  async #maxMembers(): Promise<number> {
    const cfg = await this.#configService.getMany('team.maxMembers')
    return cfg['team.maxMembers']
  }

  /**
   * Appartenance STRICTE, et la SEULE porte de lecture d'une équipe.
   *
   * Une version précédente laissait passer un invité en attente : c'était
   * juste tant qu'elle ne servait qu'un aperçu d'équipe (nom, effectif,
   * propriétaire) à qui doit décider s'il accepte. La fiche, la table des
   * membres, l'historique de raid et le classement interne sont d'un autre
   * ordre — niveau, points hebdomadaires, dégâts, dernière connexion et
   * score de collection de chaque membre. Une invitation ne donne pas droit
   * à ça, et n'importe quel officier peut en émettre une. L'aperçu sur
   * lequel un invité décide vit dans `GET /invitations/:token`.
   *
   * Publique parce que la route de classement interne compose son propre
   * calcul et a besoin de la même porte : deux portes pour la même donnée,
   * c'est celle qu'on oublie qui décide.
   */
  async getTeamAsMember(
    teamId: string,
    userId: string,
  ): Promise<TeamWithMembers> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (!team.members.some((member) => member.userId === userId)) {
      throw Boom.forbidden('Not a member of this team')
    }
    return team
  }

  async #assertHasRoom(teamId: string): Promise<void> {
    const [memberCount, maxMembers] = await Promise.all([
      this.#memberRepo.countByTeam(teamId),
      this.#maxMembers(),
    ])
    if (memberCount >= maxMembers) {
      throw Boom.forbidden(`Cette équipe est complète (${maxMembers} membres)`)
    }
  }

  async createTeam(
    ownerId: string,
    data: { name: string; description?: string },
  ): Promise<TeamWithMembers> {
    const count = await this.#teamRepo.countByUserId(ownerId)
    if (count >= MAX_TEAMS_PER_USER) {
      throw Boom.forbidden(
        `Maximum ${MAX_TEAMS_PER_USER} équipes par utilisateur`,
      )
    }

    const slug = slugify(data.name, { lower: true, strict: true })

    // Wrap in a transaction so the creator's TEAM_JOINED event is tracked
    // atomically with the team + member row creation.
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ownerId,
          members: { create: { userId: ownerId, role: 'OWNER' } },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
        },
      })
      // The creator becomes a member — track the event so the join_team quest progresses.
      await this.#achievementsDomain.track(tx, ownerId, { kind: 'TEAM_JOINED' })
      return team as unknown as TeamWithMembers
    })
  }

  async #resolveInvitationTarget(
    teamId: string,
    target: { email?: string; username?: string },
  ): Promise<{ targetUserId?: string; targetEmail?: string }> {
    if (target.username) {
      const user = await this.#userRepo.findByUsername(target.username)
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const alreadyMember = await this.#memberRepo.findByTeamAndUser(
        teamId,
        user.id,
      )
      if (alreadyMember) {
        throw Boom.conflict('User is already a member')
      }
      const existing = await this.#invitationRepo.findPendingByTeamAndUser(
        teamId,
        user.id,
      )
      if (existing) {
        throw Boom.conflict('Invitation already pending for this user')
      }
      return { targetUserId: user.id }
    }
    if (target.email) {
      const existing = await this.#invitationRepo.findPendingByTeamAndEmail(
        teamId,
        target.email,
      )
      if (existing) {
        throw Boom.conflict('Invitation already pending for this email')
      }
      return { targetEmail: target.email }
    }
    throw Boom.badRequest('Provide email or username')
  }

  async inviteMember(
    teamId: string,
    actorId: string,
    target: { email?: string; username?: string },
  ): Promise<InvitationEntity> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Only ADMIN or OWNER can invite members')
    }

    await this.#assertHasRoom(teamId)

    const { targetUserId, targetEmail } = await this.#resolveInvitationTarget(
      teamId,
      target,
    )

    const invitation = await this.#invitationRepo.create({
      teamId,
      invitedById: actorId,
      invitedEmail: targetEmail,
      invitedUserId: targetUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })

    // Send invitation email (non-fatal)
    const inviterUser = await this.#userRepo.findById(actorId)
    const recipientEmail =
      invitation.invitedEmail ??
      (invitation.invitedUserId
        ? ((await this.#userRepo.findById(invitation.invitedUserId))?.email ??
          null)
        : null)

    if (recipientEmail && inviterUser) {
      try {
        await this.#mailService.sendTeamInvitationEmail({
          to: recipientEmail,
          teamName: team.name,
          inviterName: inviterUser.username,
          token: invitation.token,
        })
        await this.#invitationRepo.updateEmailSentAt(invitation.id, new Date())
      } catch {
        // Email failure is non-fatal
      }
    }

    return invitation
  }

  /**
   * Un lien d'invitation est un secret partagé, pas un droit d'entrée. Il
   * circule par e-mail et atterrit souvent dans un navigateur déjà connecté
   * sur un AUTRE compte : sans cette garde, ce compte-là lit l'invitation, et
   * — quand elle vise une adresse plutôt qu'un compte existant, `invitedUserId`
   * étant alors nul — entre dans l'équipe à la place du destinataire.
   *
   * La garde couvre donc les deux formes d'invitation, et la lecture autant
   * que l'écriture : le `GET` doit refuser AVANT d'afficher le nom de l'équipe,
   * sinon le front propose un bouton « Rejoindre » que le back rejettera.
   */
  async #assertIsRecipient(
    invitation: Pick<InvitationEntity, 'invitedUserId' | 'invitedEmail'>,
    userId: string,
  ): Promise<void> {
    if (invitation.invitedUserId) {
      if (invitation.invitedUserId !== userId) {
        throw Boom.forbidden('This invitation is for another user')
      }
      return
    }
    if (invitation.invitedEmail) {
      const user = await this.#userRepo.findById(userId)
      // Comparaison en minuscules par prudence : `normalizerExtension` abaisse
      // déjà les e-mails à l'écriture, mais la garde ne doit pas en dépendre.
      if (user?.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
        throw Boom.forbidden('This invitation is for another user')
      }
      return
    }
    // Ni compte ni adresse : personne n'en est le destinataire.
    throw Boom.forbidden('This invitation is for another user')
  }

  /**
   * L'aperçu que voit l'invité avant de trancher. Le `EXPIRED` est dérivé ici
   * plutôt que stocké : rien ne balaie les invitations périmées en base.
   */
  async getInvitationForRecipient(
    token: string,
    userId: string,
  ): Promise<InvitationPreview> {
    const invitation = await this.#invitationRepo.findByTokenWithDetails(token)
    if (!invitation) {
      throw Boom.notFound('Invitation not found')
    }
    await this.#assertIsRecipient(invitation, userId)
    const status: InvitationPreview['status'] =
      invitation.status === 'PENDING' && invitation.expiresAt < new Date()
        ? 'EXPIRED'
        : invitation.status
    return { ...invitation, status }
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation) {
      throw Boom.notFound('Invitation not found')
    }
    if (invitation.status !== 'PENDING') {
      throw Boom.conflict('Invitation already processed')
    }
    if (invitation.expiresAt < new Date()) {
      throw Boom.resourceGone('Invitation expired')
    }

    await this.#assertIsRecipient(invitation, userId)

    const alreadyMember = await this.#memberRepo.findByTeamAndUser(
      invitation.teamId,
      userId,
    )
    if (alreadyMember) {
      throw Boom.conflict('Already a member of this team')
    }

    const userCount = await this.#teamRepo.countByUserId(userId)
    if (userCount >= MAX_TEAMS_PER_USER) {
      throw Boom.forbidden(
        `Maximum ${MAX_TEAMS_PER_USER} équipes par utilisateur`,
      )
    }

    // Le plafond mord ICI, à l'entrée — pas seulement à l'invitation. Une
    // invitation émise quand il restait une place, acceptée après que
    // quelqu'un d'autre a pris la dernière, doit être refusée.
    await this.#assertHasRoom(invitation.teamId)

    await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      await tx.teamMember.create({
        data: { teamId: invitation.teamId, userId, role: 'MEMBER' },
      })
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      })
      await this.#achievementsDomain.track(tx, userId, { kind: 'TEAM_JOINED' })
    })
  }

  async declineInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation) {
      throw Boom.notFound('Invitation not found')
    }
    if (invitation.status !== 'PENDING') {
      throw Boom.conflict('Invitation already processed')
    }
    await this.#assertIsRecipient(invitation, userId)
    await this.#invitationRepo.updateStatus(invitation.id, 'DECLINED')
  }

  async removeMember(
    teamId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Insufficient permissions')
    }

    const target = team.members.find((m) => m.userId === targetUserId)
    if (!target) {
      throw Boom.notFound('Member not found')
    }
    if (target.role === 'OWNER') {
      throw Boom.forbidden('Cannot remove the owner')
    }
    if (actor.role === 'ADMIN' && target.role === 'ADMIN') {
      throw Boom.forbidden('ADMIN cannot remove another ADMIN')
    }

    await this.#memberRepo.remove(teamId, targetUserId)
  }

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const member = team.members.find((m) => m.userId === userId)
    if (!member) {
      throw Boom.notFound('Not a member of this team')
    }
    if (member.role === 'OWNER') {
      throw Boom.forbidden('Owner must transfer ownership before leaving')
    }

    await this.#memberRepo.remove(teamId, userId)
  }

  async transferOwnership(
    teamId: string,
    ownerId: string,
    newOwnerId: string,
  ): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== ownerId) {
      throw Boom.forbidden('Only the owner can transfer ownership')
    }

    const newOwner = team.members.find((m) => m.userId === newOwnerId)
    if (!newOwner) {
      throw Boom.notFound('New owner must be a member of the team')
    }

    await this.#postgresOrm.prisma.$transaction([
      this.#postgresOrm.prisma.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      }),
      this.#postgresOrm.prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: ownerId } },
        data: { role: 'MEMBER' },
      }),
      this.#postgresOrm.prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: newOwnerId } },
        data: { role: 'OWNER' },
      }),
    ])
  }

  /**
   * `motto` et `hue` suivent la sémantique de Prisma, et c'est voulu : clé
   * absente = colonne inchangée, `null` = colonne effacée. Effacer la teinte
   * n'est pas une perte, c'est un retour au hachage du nom (`hueFromName`),
   * qui reste le repli de toutes les vues.
   */
  async updateTeam(
    teamId: string,
    userId: string,
    data: {
      name: string
      description?: string
      motto?: string | null
      hue?: number | null
    },
  ): Promise<TeamWithMembers> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== userId) {
      throw Boom.forbidden('Only the owner can update the team')
    }

    const slug = slugify(data.name, { lower: true, strict: true })
    return this.#teamRepo.update(teamId, {
      name: data.name,
      slug,
      description: data.description,
      motto: data.motto,
      hue: data.hue,
    })
  }

  /**
   * Supprime l'équipe — et REFUSE tant qu'un enjeu y court encore.
   *
   * Les clés étrangères de Duel et de Bet sont en `onDelete: Cascade` :
   * supprimer l'équipe efface ses paris et ses duels. Or la mise d'un pari
   * est débitée AU PLACEMENT et n'existe nulle part ailleurs, et les cartes
   * comptées d'un duel sont dues au vainqueur.
   *
   * La version précédente remboursait la mise et annulait les duels. C'était
   * encore une option gratuite, simplement déplacée : le propriétaire parie
   * sur un compte complice, la cible tire, un tirage qualifiant règle le
   * pari en gain au moment même du tirage — et si la fenêtre tourne mal, la
   * cible cesse de tirer et le propriétaire supprime l'équipe avant
   * l'échéance pour récupérer sa mise. Espérance positive, aucun risque, et
   * répétable : le plafond porte sur les équipes SIMULTANÉES, pas sur le
   * fait d'en recréer une. Même forme côté cartes — un duelliste en train de
   * perdre supprimait l'équipe et ses cartes comptées ne partaient jamais.
   *
   * D'où la règle : on ne rend rien et on ne détruit rien. Si un enjeu court
   * encore, la suppression est REFUSÉE et le propriétaire attend — au plus
   * quelques jours, le délai d'acceptation et l'échéance étant tous deux
   * bornés.
   *
   * La passe de règlement AVANT ce contrôle est ce qui rend le refus juste
   * plutôt que trop zélé : le règlement est paresseux (un pari ne se tranche
   * qu'au tirage suivant de la cible ou à la lecture de la vue d'équipe), si
   * bien qu'un enjeu dont l'issue est DÉJÀ déterminée dort en ACTIVE jusqu'à
   * ce que quelqu'un le regarde. Sans elle, on refuserait des suppressions
   * parfaitement légitimes.
   *
   * Effet de bord recherché : un règlement qui échoue laisse son enjeu
   * ACTIVE, donc BLOQUE la suppression au lieu de la laisser détruire une
   * ligne qu'on n'a pas su trancher. `settleTeamWagers` est idempotent, le
   * propriétaire n'a qu'à réessayer.
   */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== userId) {
      throw Boom.forbidden('Only the owner can delete the team')
    }

    // Hors transaction, exprès : chaque règlement ouvre la sienne.
    await this.#duelDomain.settleTeamWagers(teamId, new Date())

    await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Comptés DANS la transaction, avec la suppression : hors
          // transaction, un pari placé entre le contrôle et la suppression
          // serait détruit avec sa mise. Sous Serializable, ces comptes sont
          // des lectures de prédicat que le placement concurrent contredit —
          // l'une des deux transactions échoue en P2034 et `retryOnSerialization`
          // la rejoue, cette fois avec le pari en vue.
          const [openBets, openDuels] = await Promise.all([
            tx.bet.count({ where: { teamId, status: 'ACTIVE' } }),
            tx.duel.count({
              where: { teamId, status: { in: ['PENDING', 'ACTIVE'] } },
            }),
          ])
          if (openBets > 0 || openDuels > 0) {
            throw Boom.conflict(pendingWagersMessage(openBets, openDuels))
          }

          await this.#teamRepo.deleteInTx(tx, teamId)
        },
        {
          isolationLevel: 'Serializable',
          // La transaction se réduit à deux comptes et une suppression, mais
          // cette suppression est une cascade qui emporte membres,
          // invitations, raids, duels, paris et transferts : sur une grosse
          // équipe elle dépasse le délai Prisma par défaut de 5 s. On relève
          // AUSSI `maxWait` — l'attente d'une connexion du pool, à 2 s par
          // défaut — sinon la même grosse équipe échoue avant même d'ouvrir.
          maxWait: DELETE_TX_MAX_WAIT_MS,
          timeout: DELETE_TX_TIMEOUT_MS,
        },
      ),
    )
  }

  /**
   * La liste « Mes équipes ». Un seul aller-retour par sujet : les équipes,
   * le plafond, et le raid en cours de TOUTES les équipes d'un coup — pas
   * une lecture de raid par ligne.
   */
  async listMyTeams(
    userId: string,
    now: Date = new Date(),
  ): Promise<TeamListItem[]> {
    const teams = await this.#teamRepo.findByUserId(userId)
    if (teams.length === 0) {
      return []
    }
    const [cfg, badges] = await Promise.all([
      this.#configService.getMany('team.maxMembers', 'team.recruitDays'),
      this.#raidDomain.currentRaidBadges(
        teams.map((team) => team.id),
        now,
      ),
    ])
    return teams.map((team) => {
      // Toujours présente : la requête ne renvoie que les équipes dont le
      // lecteur est membre, et n'inclut que SA ligne d'appartenance.
      const mine = team.members[0]
      const role = mine?.role ?? 'MEMBER'
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        avatar: team.avatar,
        ownerId: team.ownerId,
        createdAt: team.createdAt,
        level: team.level,
        hue: resolveHue(team),
        memberCount: team._count.members,
        maxMembers: cfg['team.maxMembers'],
        myRole: role,
        myRoleLabel: roleLabel(
          role,
          mine?.joinedAt ?? team.createdAt,
          now,
          cfg['team.recruitDays'],
        ),
        // `null` quand l'équipe n'a pas encore ouvert son raid de la
        // semaine. La liste ne le crée pas : ce serait figer les PV du boss
        // sur l'effectif du moment, juste parce qu'on a ouvert une page.
        raid: badges.get(team.id) ?? null,
      }
    })
  }

  /**
   * L'en-tête de la fiche d'équipe : identité, progression, bonus, points
   * de la semaine, rang global et raids gagnés. `getTeamAsMember` d'abord —
   * c'est lui qui porte le contrôle d'appartenance, tout le reste n'est que
   * composition.
   *
   * MEMBRES SEULEMENT, pas la tolérance pour un invité en attente. Elle
   * datait de l'époque où cette lecture servait un aperçu, et elle ne
   * laissait plus qu'un écran cassé : les trois autres appels de la fiche
   * (membres, raids, classement) refusent un invité, donc la carte
   * d'identité s'affichait au-dessus de deux panneaux en erreur et d'un
   * historique qui affirmait « aucun raid » faute de branche d'erreur.
   * Aucun chemin du front n'y envoie un invité — le flux d'invitation passe
   * par `GET /invitations/:token`, qui rend son propre aperçu.
   */
  async getTeamDetail(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<TeamDetail> {
    const team = await this.getTeamAsMember(teamId, userId)
    const [cfg, perks, weekly, rankGlobal, raidsWon] = await Promise.all([
      this.#configService.getMany(
        'team.maxMembers',
        'teamLevel.xpBase',
        'teamLevel.xpExp',
      ),
      this.#teamProgressionDomain.getPerksView(teamId),
      this.#teamProgressionDomain.getWeeklyPoints(teamId, now),
      // Le classement d'équipes EXISTANT (complétion de collection), pas un
      // second classement bâti pour cet écran.
      this.#leaderboardDomain.getTeamRank(teamId),
      this.#raidDomain.countRaidsWon(teamId),
    ])
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      avatar: team.avatar,
      ownerId: team.ownerId,
      createdAt: team.createdAt,
      members: team.members,
      memberCount: team.members.length,
      maxMembers: cfg['team.maxMembers'],
      level: perks.level,
      xp: perks.xp,
      // Le SEUIL du niveau courant, pas le reliquat : c'est le dénominateur
      // de la barre d'XP, et il n'est jamais nul (au niveau maximum, `xp`
      // reste à 0 et la barre est vide plutôt qu'indéfinie).
      xpNext: xpForTeamLevel(
        perks.level,
        cfg['teamLevel.xpBase'],
        cfg['teamLevel.xpExp'],
      ),
      motto: team.motto,
      hue: resolveHue(team),
      perkPoints: perks.perkPoints,
      perks: perks.perks,
      maxRank: perks.maxRank,
      weekPts: weekly.total,
      rankGlobal,
      raidsWon,
    }
  }

  /**
   * La table des membres de la fiche d'équipe, triée par dégâts de raid
   * décroissants (le tri de la maquette).
   *
   * Les dégâts et les attaques restantes viennent du DOMAINE RAID, qui
   * possède déjà cette agrégation pour sa propre vue : en écrire une
   * seconde ici, c'est garantir qu'elles divergeront au premier changement
   * de règle.
   */
  async listMembers(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<TeamMembersView> {
    const team = await this.getTeamAsMember(teamId, userId)
    const memberIds = team.members.map((member) => member.userId)
    const [cfg, weekly, raidStats, users] = await Promise.all([
      this.#configService.getMany('team.recruitDays'),
      this.#teamProgressionDomain.getWeeklyPoints(teamId, now),
      this.#raidDomain.memberRaidStats(team, now),
      this.#userRepo.findManyByIds(memberIds),
    ])

    const pointsOf = new Map(
      weekly.members.map((row) => [row.userId, row.points]),
    )
    const statsOf = new Map(raidStats.members.map((row) => [row.userId, row]))
    const userOf = new Map(users.map((user) => [user.id, user]))

    const rows = team.members.map((member) => {
      const user = userOf.get(member.userId)
      const stats = statsOf.get(member.userId)
      return {
        id: member.id,
        userId: member.userId,
        user: {
          id: member.userId,
          username: user?.username ?? member.user?.username ?? 'Inconnu',
          avatar: user?.avatar ?? member.user?.avatar ?? null,
        },
        role: member.role,
        roleLabel: roleLabel(
          member.role,
          member.joinedAt,
          now,
          cfg['team.recruitDays'],
        ),
        joinedAt: member.joinedAt,
        level: user?.level ?? 1,
        weekPoints: pointsOf.get(member.userId) ?? 0,
        raidDamage: stats?.damage ?? 0,
        raidAttacksLeft: stats?.attacksRemainingToday ?? 0,
        // Dernière CONNEXION : voir `TeamMemberView`.
        lastSeenAt: user?.lastLoginAt ?? null,
        isMe: member.userId === userId,
      }
    })

    // Dégâts décroissants, puis points de la semaine, puis le nom : sans les
    // deux départages, l'ordre de deux membres à 0 dégât changerait d'une
    // requête à l'autre.
    rows.sort((a, b) => {
      if (b.raidDamage !== a.raidDamage) {
        return b.raidDamage - a.raidDamage
      }
      if (b.weekPoints !== a.weekPoints) {
        return b.weekPoints - a.weekPoints
      }
      return a.user.username.localeCompare(b.user.username)
    })

    return {
      weekKey: weekly.weekKey,
      attacksPerDay: raidStats.attacksPerDay,
      members: rows.map(
        (row, index): TeamMemberView => ({
          rank: index + 1,
          ...row,
        }),
      ),
    }
  }

  /**
   * L'historique des raids : les semaines RÉVOLUES, plus récentes d'abord.
   * La semaine en cours n'y figure pas — elle a sa propre carte de raid,
   * vivante, sur le même écran.
   */
  async listRaidHistory(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ) {
    await this.getTeamAsMember(teamId, userId)
    const cfg = await this.#configService.getMany('teamRaid.historyLimit')
    return this.#raidDomain.getHistory(
      teamId,
      cfg['teamRaid.historyLimit'],
      now,
    )
  }

  async resendInvitationEmail(token: string, actorId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation || invitation.status !== 'PENDING') {
      throw Boom.notFound('Invitation not found or not pending')
    }

    const team = await this.#teamRepo.findById(invitation.teamId)
    if (!team) {
      throw Boom.internal('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Only ADMIN or OWNER can resend invitations')
    }

    // Cooldown: 5 minutes since last emailSentAt
    if (invitation.emailSentAt) {
      const elapsed = Date.now() - invitation.emailSentAt.getTime()
      if (elapsed < 5 * 60 * 1000) {
        const retryAfterSeconds = Math.ceil((5 * 60 * 1000 - elapsed) / 1000)
        throw Boom.tooManyRequests('Cooldown actif', { retryAfterSeconds })
      }
    }

    const recipientEmail =
      invitation.invitedEmail ??
      (invitation.invitedUserId
        ? ((await this.#userRepo.findById(invitation.invitedUserId))?.email ??
          null)
        : null)

    if (!recipientEmail) {
      throw Boom.badRequest('No recipient email found')
    }

    const inviter = invitation.invitedById
      ? await this.#userRepo.findById(invitation.invitedById)
      : null

    await this.#mailService.sendTeamInvitationEmail({
      to: recipientEmail,
      teamName: team.name,
      inviterName: inviter?.username ?? "Quelqu'un",
      token: invitation.token,
    })

    await this.#invitationRepo.updateEmailSentAt(invitation.id, new Date())
  }
}
