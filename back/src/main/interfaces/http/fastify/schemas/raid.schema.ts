import { z } from 'zod/v4'

import { MAX_RAID_TEAM_SIZE } from '../../../../domain/raid/raid-rules'
import { towerElementSchema } from './tower.schema'

export const raidTeamParamSchema = z.object({ id: z.string() })

const raidRewardSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  gold: z.number().int(),
  xp: z.number().int(),
  cardRarity: z.string().nullable(),
})

export const raidTierViewSchema = z.object({
  pct: z.number().int(),
  reached: z.boolean(),
  reward: raidRewardSchema,
})

const raidUserMiniSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
})

export const raidContributionSchema = z.object({
  user: raidUserMiniSchema,
  damage: z.number().int(),
  attacks: z.number().int(),
})

export const raidViewResponseSchema = z.object({
  id: z.string(),
  weekKey: z.string(),
  endsAt: z.string(),
  boss: z.object({
    name: z.string(),
    element: towerElementSchema,
    imageUrl: z.string().nullable(),
    power: z.number(),
  }),
  maxHp: z.number().int(),
  hp: z.number().int(),
  damageDone: z.number().int(),
  memberCountAtStart: z.number().int(),
  killedAt: z.string().nullable(),
  tiers: z.array(raidTierViewSchema),
  me: z.object({
    attacksPerDay: z.number().int(),
    attacksRemainingToday: z.number().int(),
    damage: z.number().int(),
    attacks: z.number().int(),
  }),
  contributions: z.array(raidContributionSchema),
})

export const raidContributionsResponseSchema = z.object({
  contributions: z.array(raidContributionSchema),
})

export const raidAttackBodySchema = z.object({
  userCardIds: z.array(z.string()).min(1).max(MAX_RAID_TEAM_SIZE),
})

// Même forme que simulatorUnitSchema de tower.schema.ts (non exporté là-bas).
const simulatorUnitSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
  variant: z.string().nullable().optional(),
  setName: z.string().nullable().optional(),
  level: z.number().int().nullable().optional(),
  hp: z.number().int(),
  atk: z.number().int(),
  def: z.number().int(),
  spd: z.number().int(),
  attackPattern: z.string(),
  passiveKey: z.string().nullable(),
  element: z.string().nullable().optional(),
  palier: z.number().int(),
})

export const raidAttackResponseSchema = z.object({
  log: z.array(z.unknown()),
  teamA: z.array(simulatorUnitSchema),
  teamB: z.array(simulatorUnitSchema),
  damage: z.number().int(),
  hpBefore: z.number().int(),
  hpAfter: z.number().int(),
  maxHp: z.number().int(),
  killed: z.boolean(),
  newTiers: z.array(raidTierViewSchema),
  attacksRemainingToday: z.number().int(),
})
