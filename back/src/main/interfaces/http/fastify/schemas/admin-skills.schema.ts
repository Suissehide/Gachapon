import { z } from 'zod/v4'

export const createBranchSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().min(1),
  color: z.string().min(1),
  order: z.int().nonnegative(),
})

export const updateBranchSchema = createBranchSchema.partial()

export const branchIdParamSchema = z.object({ id: z.string().min(1) })

export const createNodeSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().min(1),
  maxLevel: z.int().min(1).max(5),
  effectType: z.enum([
    'REGEN',
    'LUCK',
    'DUST_HARVEST',
    'TOKEN_VAULT',
    'FREE_PULL_CHANCE',
    'MULTI_TOKEN_CHANCE',
    'GOLDEN_BALL_CHANCE',
    'SHOP_DISCOUNT',
  ]),
  posX: z.int(),
  posY: z.int(),
  levels: z.array(z.object({ level: z.int().min(1).max(5), effect: z.number() })).min(1),
})

export const updateNodeSchema = createNodeSchema.partial()

export const nodeIdParamSchema = z.object({ id: z.string().min(1) })

export const createEdgeSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  minLevel: z.int().min(1).default(1),
})

export const edgeParamSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
})

export const updateConfigSchema = z.object({
  resetCostPerPoint: z.int().nonnegative(),
})
