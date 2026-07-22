import { z } from 'zod/v4'

import { SUBSTAT_KEYS } from '../../../../domain/equipment/equipment-progression'

const equipmentSlotEnum = z.enum(['WEAPON', 'ARMOR', 'ACCESSORY'])
const rarityEnum = z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])

export const substatKeyEnum = z.enum(SUBSTAT_KEYS)

export const substatSchema = z.object({
  key: substatKeyEnum,
  value: z.number(),
})

export const equipmentInstanceSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  name: z.string(),
  slot: equipmentSlotEnum,
  rarity: rarityEnum,
  imageUrl: z.string().nullable(),
  bonuses: z.record(z.string(), z.number()),
  level: z.number().int(),
  substats: z.array(substatSchema),
  baseBoost: z.number(),
  equippedOnId: z.string().nullable(),
  equippedOnCardName: z.string().nullable(),
  obtainedAt: z.string(),
})

export const equipmentListResponseSchema = z.object({
  items: z.array(equipmentInstanceSchema),
})

export const equipmentIdParamSchema = z.object({
  userEquipmentId: z.string().uuid(),
})

export const equipmentEquipBodySchema = z.object({
  targetUserCardId: z.string().uuid(),
})

export const equipmentEquipResponseSchema = z.object({
  equippedOnId: z.string(),
  previouslyEquippedId: z.string().nullable(),
})

export const equipmentUnequipResponseSchema = z.object({
  unequipped: z.boolean(),
})

export const equipmentUpgradeResponseSchema = z.object({
  level: z.number().int(),
  substats: z.array(substatSchema),
  baseBoost: z.number(),
  goldSpent: z.number().int(),
  newGold: z.number().int(),
  milestone: z
    .object({
      type: z.enum(['added', 'improved']),
      key: substatKeyEnum,
      rolledValue: z.number(),
      newValue: z.number(),
    })
    .nullable(),
})

export const adminGrantEquipmentBodySchema = z.object({
  userId: z.string().uuid(),
  equipmentId: z.string().uuid().optional(),
})

export const adminGrantEquipmentResponseSchema = z.object({
  userEquipmentId: z.string(),
  equipmentName: z.string(),
})

export const equipmentSalvageBodySchema = z.object({
  userEquipmentIds: z.array(z.string().uuid()).min(1).max(200),
})

export const equipmentSalvageResponseSchema = z.object({
  goldEarned: z.number().int(),
  newGold: z.number().int(),
  destroyedCount: z.number().int(),
})
