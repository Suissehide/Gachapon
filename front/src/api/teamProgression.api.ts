import { apiUrl } from '../constants/config.constant.ts'
import { TEAM_ROUTES } from '../constants/teams.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'
import type { TowerElement } from './tower.api.ts'

export type TeamMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type TeamMemberRoleLabel = 'Chef' | 'Officier' | 'Membre' | 'Recrue'

export type TeamPerkKey = 'loot' | 'raid' | 'xp' | 'forge'

// Croisé champ par champ avec `teamPerkStateSchema`
// (back/src/main/interfaces/http/fastify/schemas/teams.schema.ts).
export type TeamPerkState = {
  key: TeamPerkKey
  rank: number
  effect: number
  unlockLevel: number
  unlocked: boolean
}

export type TeamDetailMember = {
  id: string
  userId: string
  role: TeamMemberRole
  joinedAt: string
  // Absent seulement si la jointure utilisateur n'a rien ramené (compte
  // supprimé entre deux lectures) — jamais en fonctionnement normal.
  user?: { id: string; username: string; avatar: string | null }
}

// Croisé champ par champ avec `teamDetailResponseSchema`. C'est la réponse
// de GET /teams/:id : plus riche que `Team` (constants/teams.constant.ts,
// qui reste la forme « brute » de création/modification) — et contrairement
// à `TeamSummary`, elle porte toujours `members`.
export type TeamDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: string
  members: TeamDetailMember[]
  memberCount: number
  maxMembers: number
  level: number
  xp: number
  xpNext: number
  motto: string | null
  hue: number
  perkPoints: number
  perks: TeamPerkState[]
  maxRank: number
  weekPts: number
  rankGlobal: number | null
  raidsWon: number
}

// Croisé champ par champ avec l'entrée `members[]` de
// `teamMembersResponseSchema`.
export type TeamMemberRow = {
  rank: number
  id: string
  userId: string
  user: { id: string; username: string; avatar: string | null }
  role: TeamMemberRole
  roleLabel: TeamMemberRoleLabel
  joinedAt: string
  level: number
  weekPoints: number
  raidDamage: number
  raidAttacksLeft: number
  // Dernière CONNEXION, pas dernière activité.
  lastSeenAt: string | null
  isMe: boolean
}

// Croisé champ par champ avec `teamMembersResponseSchema`.
export type TeamMembersView = {
  weekKey: string
  attacksPerDay: number
  members: TeamMemberRow[]
}

// Croisé champ par champ avec l'entrée `raids[]` de
// `teamRaidHistoryResponseSchema`. `bossElement` réutilise `TowerElement`
// (api/tower.api.ts) : le back le pinne sur `towerElementSchema`, qui ne
// porte que les 4 éléments avec tour, jamais LIGHT/DARK.
export type TeamRaidHistoryEntry = {
  weekKey: string
  endsAt: string
  bossName: string
  bossElement: TowerElement
  maxHp: number
  damage: number
  pct: number
  killedAt: string | null
}

// Croisé champ par champ avec `teamRaidHistoryResponseSchema`.
export type TeamRaidHistoryView = {
  raids: TeamRaidHistoryEntry[]
}

// Croisé champ par champ avec `teamPerksResponseSchema` — la vue renvoyée
// par le spend et le reset des bonus.
export type TeamPerksView = {
  teamId: string
  level: number
  xp: number
  xpToNext: number
  perkPoints: number
  maxRank: number
  perks: TeamPerkState[]
}

const TEAM_ACCESS_ERRORS = {
  403: {
    title: 'Accès refusé',
    message: 'Tu ne fais pas partie de cette équipe.',
  },
  404: {
    title: 'Équipe introuvable',
    message: "Cette équipe n'existe pas ou a été supprimée.",
  },
}

const SPEND_PERK_ERRORS = {
  403: {
    title: 'Accès refusé',
    message: 'Seuls le chef et les officiers peuvent investir les points.',
  },
  404: {
    title: 'Équipe introuvable',
    message: "Cette équipe n'existe pas ou a été supprimée.",
  },
  409: {
    title: 'Investissement impossible',
    message:
      'Ce bonus est déjà au rang maximum, verrouillé à ce niveau, ou aucun point de bonus disponible.',
  },
}

const RESET_PERK_ERRORS = {
  403: {
    title: 'Accès refusé',
    message: 'Seul le chef peut réinitialiser les bonus.',
  },
  404: {
    title: 'Équipe introuvable',
    message: "Cette équipe n'existe pas ou a été supprimée.",
  },
}

export const TeamProgressionApi = {
  getTeamDetail: async (teamId: string): Promise<TeamDetail> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`)
    if (!res.ok) {
      handleHttpError(res, TEAM_ACCESS_ERRORS, "Chargement de l'équipe")
    }
    return res.json()
  },

  getTeamMembers: async (teamId: string): Promise<TeamMembersView> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.members(teamId)}`)
    if (!res.ok) {
      handleHttpError(res, TEAM_ACCESS_ERRORS, 'Chargement des membres')
    }
    return res.json()
  },

  getTeamRaidHistory: async (teamId: string): Promise<TeamRaidHistoryView> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.raids(teamId)}`)
    if (!res.ok) {
      handleHttpError(
        res,
        TEAM_ACCESS_ERRORS,
        "Chargement de l'historique des raids",
      )
    }
    return res.json()
  },

  spendPerk: async (
    teamId: string,
    key: TeamPerkKey,
  ): Promise<TeamPerksView> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.perks(teamId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (!res.ok) {
      handleHttpError(res, SPEND_PERK_ERRORS, 'Investissement du bonus')
    }
    return res.json()
  },

  resetPerks: async (teamId: string): Promise<TeamPerksView> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.perksReset(teamId)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(res, RESET_PERK_ERRORS, 'Réinitialisation des bonus')
    }
    return res.json()
  },
}
