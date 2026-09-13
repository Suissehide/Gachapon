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

/**
 * Plafond de niveaux par nœud. Le seed monte à 7 (Ferveur) : l'ancien 5
 * rendait ces nœuds ineditables depuis l'admin (validation en 400).
 */
const MAX_NODE_LEVEL = 10

export const createNodeSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().min(1),
  maxLevel: z.int().min(1).max(MAX_NODE_LEVEL),
  effectType: z.enum([
    'REGEN',
    'LUCK',
    'DUST_HARVEST',
    'TOKEN_VAULT',
    'FREE_PULL_CHANCE',
    'MULTI_TOKEN_CHANCE',
    'GOLDEN_BALL_CHANCE',
    'SHOP_DISCOUNT',
    'PULL_XP_BONUS',
    'PITY_BOOST',
    'VARIANT_LUCK',
    'DAILY_SHOP_SLOT',
    'WISHLIST_COOLDOWN',
    'PC_VAULT',
    'PC_REGEN',
    'SWEEP_COST',
    'GOLD_BONUS',
    'COMBAT_XP_BONUS',
    'DROP_BONUS',
    'UPGRADE_DUST_DISCOUNT',
    'GOLD_SHOP_DISCOUNT',
    'DAILY_SHOP_LUCK',
    'EQUIP_UPGRADE_DISCOUNT',
    'SALVAGE_BONUS',
    'TOKEN_OVERFLOW_DUST',
    'ENERGY_PACK_CAP',
  ]),
  posX: z.int(),
  posY: z.int(),
  levels: z
    .array(
      z.object({
        level: z.int().min(1).max(MAX_NODE_LEVEL),
        effect: z.number(),
      }),
    )
    .min(1),
})

export const updateNodeSchema = createNodeSchema.partial()

export const nodeIdParamSchema = z.object({ id: z.string().min(1) })

export const createEdgeSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  minLevel: z.int().min(1).default(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const edgeParamSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
})

export const updateConfigSchema = z.object({
  resetCostPerPoint: z.int().nonnegative(),
})
