import { z } from 'zod/v4'

export const wagersTeamParamSchema = z.object({ id: z.string() })

export const duelParamSchema = z.object({
  id: z.string(),
  duelId: z.string(),
})

export const proposeDuelBodySchema = z.object({
  opponentId: z.string(),
})

const wagerUserMiniSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
})

const duelStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'SETTLED',
  'EXPIRED',
  'DECLINED',
  'CANCELLED',
])

// Croisé champ par champ avec `DuelView`
// (types/domain/wagers/wagers.domain.interface.ts) : le provider Zod
// retire silencieusement du JSON toute clé absente d'ici.
export const duelViewSchema = z.object({
  id: z.string(),
  status: duelStatusSchema,
  challenger: wagerUserMiniSchema,
  opponent: wagerUserMiniSchema,
  pullCount: z.number().int(),
  challengerPulls: z.number().int(),
  opponentPulls: z.number().int(),
  challengerScore: z.number(),
  opponentScore: z.number(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  settledAt: z.string().nullable(),
  winnerId: z.string().nullable(),
  myRole: z.enum(['CHALLENGER', 'OPPONENT', 'SPECTATOR']),
})

export const wagersViewResponseSchema = z.object({
  duels: z.array(duelViewSchema),
  settledDuels: z.array(duelViewSchema),
})
