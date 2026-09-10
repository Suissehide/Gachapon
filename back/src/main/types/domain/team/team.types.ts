import type {
  InvitationStatus,
  TeamMemberRole,
} from '../../../../generated/client'
import type { TeamPerkState } from '../team-progression/team-progression.domain.interface'

export type {
  InvitationStatus,
  TeamMemberRole,
} from '../../../../generated/client'

export type TeamMemberEntity = {
  id: string
  teamId: string
  userId: string
  role: TeamMemberRole
  joinedAt: Date
  user?: { id: string; username: string; avatar: string | null }
}

export type TeamEntity = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  // Colonnes de progression — présentes sur TOUTE ligne Team depuis la
  // migration team_progression, donc sur toute lecture du dépôt.
  level: number
  /** Progression DANS le niveau courant, pas un cumul. */
  xp: number
  motto: string | null
  /**
   * Nullable EN BASE. Jamais nulle en sortie d'API : les vues la résolvent
   * par `hueFromName`, pour qu'aucun consommateur n'ait à gérer le cas.
   */
  hue: number | null
  perkPoints: number
}

export type TeamWithMembers = TeamEntity & {
  members: TeamMemberEntity[]
}

export type TeamSummary = TeamEntity & {
  _count: { members: number }
}

export type InvitationEntity = {
  id: string
  teamId: string
  token: string
  invitedById: string | null
  invitedUserId: string | null
  invitedEmail: string | null
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
  emailSentAt: Date | null
}

/** Le raid en cours d'une équipe, tel que la liste « Mes équipes » l'affiche. */
export type TeamRaidBadge = {
  bossName: string
  pct: number
}

/** Une entrée de la liste « Mes équipes ». */
export type TeamListItem = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  level: number
  /** Toujours renseignée, même quand la colonne est nulle. */
  hue: number
  memberCount: number
  maxMembers: number
  raid: TeamRaidBadge | null
}

/** L'en-tête d'identité de la fiche d'équipe. */
export type TeamDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  members: TeamMemberEntity[]
  memberCount: number
  maxMembers: number
  level: number
  /** Progression DANS le niveau courant. */
  xp: number
  /** Seuil du niveau courant : le dénominateur de la barre, jamais 0. */
  xpNext: number
  motto: string | null
  hue: number
  perkPoints: number
  perks: TeamPerkState[]
  /** Points de TOUTE l'équipe sur la semaine en cours. */
  weekPts: number
  /** Rang au classement d'équipes. `null` si l'équipe n'y figure pas. */
  rankGlobal: number | null
  raidsWon: number
}

export type TeamMemberRoleLabel = 'Chef' | 'Officier' | 'Membre' | 'Recrue'

export type TeamMemberView = {
  /** 1 pour le premier de la liste, triée par dégâts de raid décroissants. */
  rank: number
  id: string
  userId: string
  user: { id: string; username: string; avatar: string | null }
  role: TeamMemberRole
  roleLabel: TeamMemberRoleLabel
  joinedAt: Date
  /** Niveau du JOUEUR, pas de l'équipe. */
  level: number
  weekPoints: number
  raidDamage: number
  raidAttacksLeft: number
  /**
   * Dernière CONNEXION du joueur, pas sa dernière activité : un joueur
   * connecté il y a longtemps et resté sur l'onglet paraîtra plus frais
   * qu'il ne l'est. Nulle pour un compte qui ne s'est jamais connecté.
   */
  lastSeenAt: Date | null
  isMe: boolean
}

export type TeamMembersView = {
  /** Lundi de la semaine des points hebdomadaires (AAAA-MM-JJ, UTC). */
  weekKey: string
  /** Quota quotidien d'attaques de raid, bonus d'équipe compris. */
  attacksPerDay: number
  members: TeamMemberView[]
}
