import { z } from 'zod/v4'

const stageStatusEnum = z.enum(['cleared', 'current', 'locked'])

export const campaignStageSchema = z.object({
  id: z.string(),
  chapter: z.number().int(),
  index: z.number().int(),
  label: z.string(),
  isBoss: z.boolean(),
  status: stageStatusEnum,
})

export const campaignChapterSchema = z.object({
  chapter: z.number().int(),
  stages: z.array(campaignStageSchema),
})

export const campaignResponseSchema = z.object({
  highestChapter: z.number().int(),
  highestIndex: z.number().int(),
  chapters: z.array(campaignChapterSchema),
})

export const stageIdParamSchema = z.object({
  stageId: z.string().uuid(),
})

export const battleRewardsSchema = z.object({
  gold: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  isFirstClear: z.boolean(),
  equipmentDrop: z
    .object({
      userEquipmentId: z.string(),
      equipmentId: z.string(),
      name: z.string(),
      rarity: z.string(),
    })
    .nullable(),
  cardDrop: z
    .object({
      cardId: z.string(),
      name: z.string(),
      rarity: z.string(),
      wasDuplicate: z.boolean(),
    })
    .nullable(),
})

const simulatorUnitSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  hp: z.number().int(),
  atk: z.number().int(),
  def: z.number().int(),
  spd: z.number().int(),
  attackPattern: z.string(),
  passiveKey: z.string().nullable(),
  palier: z.number().int(),
})

export const battleResponseSchema = z.object({
  won: z.boolean(),
  log: z.array(z.unknown()),
  rewards: battleRewardsSchema.nullable(),
  teamA: z.array(simulatorUnitSchema),
  teamB: z.array(simulatorUnitSchema),
})

export const sweepBodySchema = z.object({
  runs: z.number().int().min(1).max(10),
})

export const sweepResponseSchema = z.object({
  runs: z.number().int(),
  totalGold: z.number().int(),
  totalDust: z.number().int(),
  totalXp: z.number().int(),
  equipmentDrops: z.array(
    z.object({
      equipmentId: z.string(),
      name: z.string(),
      rarity: z.string(),
    }),
  ),
  cardDrops: z.array(
    z.object({
      cardId: z.string(),
      name: z.string(),
      rarity: z.string(),
    }),
  ),
})
