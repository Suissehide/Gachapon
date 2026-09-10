import { z } from 'zod/v4'

import { towerElementSchema } from './tower.schema'

export const teamIdParamSchema = z.object({ id: z.string().uuid() })

export const teamUserIdParamSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
})

export const teamTokenParamSchema = z.object({ token: z.string().uuid() })

export const teamInvitationIdParamSchema = z.object({ id: z.string().uuid() })

export const teamCreateBodySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export const teamInviteBodySchema = z
  .object({
    username: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((b) => b.username || b.email, {
    message: 'Provide username or email',
  })

export const teamUpdateBodySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export const teamTransferBodySchema = z.object({
  newOwnerId: z.string().uuid(),
})

export const teamRankingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Les quatre bonus d'équipe. Le repository sous-jacent accepte n'importe
// quelle string — c'est CET enum qui empêche un rang « fantôme » de se créer
// à la frontière HTTP à partir d'une clé mal orthographiée.
export const teamPerkKeySchema = z.enum(['loot', 'raid', 'xp', 'forge'])

export const teamPerkSpendBodySchema = z.object({
  key: teamPerkKeySchema,
})

const teamPerkStateSchema = z.object({
  key: teamPerkKeySchema,
  rank: z.number().int(),
  effect: z.number(),
  unlockLevel: z.number().int(),
  unlocked: z.boolean(),
})

export const teamPerksResponseSchema = z.object({
  teamId: z.string(),
  level: z.number().int(),
  xp: z.number().int(),
  xpToNext: z.number().int(),
  perkPoints: z.number().int(),
  maxRank: z.number().int(),
  perks: z.array(teamPerkStateSchema),
})

// ── Schémas de RÉPONSE ──────────────────────────────────────────────────
//
// `fastify-type-provider-zod` retire SILENCIEUSEMENT toute clé absente du
// schéma déclaré : un champ oublié ici disparaît de la réponse sans erreur
// ni avertissement. D'où deux règles pour ce fichier — tout champ servi est
// listé, et les tests affirment sur `res.json()`, jamais sur la valeur de
// retour du domaine, qui elle ne passe pas par ce filtre.

export const teamMemberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER'])

/** Les libellés français produits par `roleLabel` — jamais une chaîne libre. */
const teamMemberRoleLabelSchema = z.enum([
  'Chef',
  'Officier',
  'Membre',
  'Recrue',
])

const teamUserMiniSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
})

const teamMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: teamMemberRoleSchema,
  joinedAt: z.date(),
  // Absent seulement si la jointure utilisateur n'a rien ramené (compte
  // supprimé entre deux lectures) — jamais en fonctionnement normal.
  user: teamUserMiniSchema.optional(),
})

/** La forme « brute » d'une équipe : création, modification. */
export const teamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  avatar: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.date(),
  members: z.array(teamMemberSchema),
})

const teamRaidBadgeSchema = z.object({
  bossName: z.string(),
  pct: z.number().int(),
})

export const teamListResponseSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().nullable(),
      avatar: z.string().nullable(),
      ownerId: z.string(),
      createdAt: z.date(),
      level: z.number().int(),
      // Jamais nulle : la vue la résout depuis le nom quand la colonne l'est.
      hue: z.number().int(),
      memberCount: z.number().int(),
      maxMembers: z.number().int(),
      // Le rôle DU LECTEUR : la carte de la liste l'affiche, et `ownerId`
      // seul ne distingue pas un officier d'un simple membre.
      myRole: teamMemberRoleSchema,
      myRoleLabel: teamMemberRoleLabelSchema,
      raid: teamRaidBadgeSchema.nullable(),
    }),
  ),
})

export const teamDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  avatar: z.string().nullable(),
  ownerId: z.string(),
  createdAt: z.date(),
  members: z.array(teamMemberSchema),
  memberCount: z.number().int(),
  maxMembers: z.number().int(),
  level: z.number().int(),
  xp: z.number().int(),
  xpNext: z.number().int(),
  motto: z.string().nullable(),
  hue: z.number().int(),
  perkPoints: z.number().int(),
  perks: z.array(teamPerkStateSchema),
  // Le front dessine `rang/maxRank` et dimensionne ses pastilles dessus :
  // c'est une valeur de config, il n'a pas le droit de la coder en dur.
  maxRank: z.number().int(),
  weekPts: z.number().int(),
  rankGlobal: z.number().int().nullable(),
  raidsWon: z.number().int(),
})

export const teamMembersResponseSchema = z.object({
  weekKey: z.string(),
  attacksPerDay: z.number().int(),
  members: z.array(
    z.object({
      rank: z.number().int(),
      id: z.string(),
      userId: z.string(),
      user: teamUserMiniSchema,
      role: teamMemberRoleSchema,
      roleLabel: teamMemberRoleLabelSchema,
      joinedAt: z.date(),
      level: z.number().int(),
      weekPoints: z.number().int(),
      raidDamage: z.number().int(),
      raidAttacksLeft: z.number().int(),
      // Dernière CONNEXION, pas dernière activité.
      lastSeenAt: z.date().nullable(),
      isMe: z.boolean(),
    }),
  ),
})

export const teamRaidHistoryResponseSchema = z.object({
  raids: z.array(
    z.object({
      weekKey: z.string(),
      endsAt: z.string(),
      bossName: z.string(),
      // Le front branche dessus (icône, couleur) : l'énumération est pinnée
      // à la frontière plutôt que laissée en chaîne libre.
      bossElement: towerElementSchema,
      maxHp: z.number().int(),
      damage: z.number().int(),
      pct: z.number().int(),
      killedAt: z.string().nullable(),
    }),
  ),
})
