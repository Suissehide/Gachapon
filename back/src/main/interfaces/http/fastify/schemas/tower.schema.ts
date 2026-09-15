import { z } from 'zod/v4'

import { TOWER_ELEMENTS } from '../../../../domain/tower/tower-slots'

// Élément d'une tour — SEULEMENT les 4 du cycle (§6 design spec), jamais
// l'énumération Prisma `CardElement` complète (6 valeurs, dont LIGHT/DARK
// qui n'ont pas de tour). Dérivé de `TOWER_ELEMENTS`, la source unique du
// domaine (domain/tower/tower-slots.ts) — jamais recopié en dur ici, sinon
// ce schéma pourrait diverger du seed/domaine. C'est ce garde-fou qui
// rejette `/tower/LIGHT` et `/tower/DARK` avec un 400 sans code
// supplémentaire.
export const towerElementSchema = z.enum(TOWER_ELEMENTS)

export const towerElementParamSchema = z.object({
  element: towerElementSchema,
})

export const towerFloorParamSchema = z.object({
  element: towerElementSchema,
  floor: z.coerce.number().int().positive(),
})

const towerFloorStatusSchema = z.enum(['cleared', 'current', 'locked'])

export const towerSummarySchema = z.object({
  element: towerElementSchema,
  // Nom propre de la tour (TOWER_NAME_BY_ELEMENT) — le front affichait
  // « Tour Feu » reconstruit depuis le nom d'élément, quand les étages
  // s'appelaient « Tour de Braise — étage 1 ».
  name: z.string(),
  // Slot alimenté par cette tour (TOWER_SLOT_BY_ELEMENT, domain/tower/tower-slots.ts) —
  // exposé ici pour que le front n'ait jamais à recopier cette table (voir
  // l'avertissement dans tower-slots.ts).
  slot: z.string(),
  highestFloor: z.number().int(),
  totalFloors: z.number().int(),
})

export const towersResponseSchema = z.object({
  towers: z.array(towerSummarySchema),
})

const towerFloorEnemySchema = z.object({
  id: z.string(),
  imageUrl: z.string().nullable(),
  power: z.number(),
  element: z.string().nullable(),
})

/**
 * Butin annoncé avant le combat. Le domaine le calculait déjà, mais il
 * manquait ICI : fastify-type-provider-zod retire de la réponse toute clé
 * absente du schéma, donc la fenêtre de préparation recevait `undefined`.
 * Miroir de `TowerFloorView['rewardPreview']` (tower.domain.ts).
 */
const towerRewardPreviewSchema = z.object({
  gold: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  /** Premier passage seulement. */
  guaranteedMinRarity: z.string().nullable(),
  /** Farm seulement — vide au premier passage. */
  rarityWeights: z.record(z.string(), z.number()),
})

export const towerFloorViewSchema = z.object({
  index: z.number().int(),
  label: z.string(),
  isBoss: z.boolean(),
  status: towerFloorStatusSchema,
  recommendedPower: z.number(),
  rewardPreview: towerRewardPreviewSchema,
  enemies: z.array(towerFloorEnemySchema),
})

export const towerViewResponseSchema = z.object({
  element: towerElementSchema,
  name: z.string(),
  highestFloor: z.number().int(),
  floors: z.array(towerFloorViewSchema),
})

export const towerBattleBodySchema = z.object({
  userCardIds: z.array(z.string()),
})

/**
 * Pièce obtenue en tour. Partagée par le combat unique et le balayage — la
 * fiche de récompense du front est la même des deux côtés, la charge utile
 * doit l'être aussi (la campagne a déjà payé le prix de deux formes
 * divergentes pour un même gain).
 */
const towerEquipmentDropSchema = z.object({
  userEquipmentId: z.string(),
  equipmentId: z.string(),
  name: z.string(),
  rarity: z.string(),
  slot: z.string(),
  setKey: z.string(),
  level: z.number().int(),
  bonuses: z.record(z.string(), z.number()),
  substats: z.array(z.object({ key: z.string(), value: z.number() })),
  baseBoost: z.number(),
})

const towerBattleRewardsSchema = z.object({
  gold: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  xpBefore: z.number().int(),
  levelBefore: z.number().int(),
  isFirstClear: z.boolean(),
  // Contrairement à la campagne, la pièce de tour n'est jamais absente en
  // cas de victoire (§6 design spec : « une pièce garantie par run, jamais
  // zéro ») — seul `rewards` lui-même est nullable (défaite = pas de
  // récompense), pas `equipmentDrop` à l'intérieur.
  equipmentDrop: towerEquipmentDropSchema,
})

export const towerSweepBodySchema = z.object({
  runs: z.number().int().min(1).max(10),
})

/**
 * Résultat d'un balayage. Pas de `cardDrops` ici, contrairement à la
 * campagne : une tour ne droppe que de l'équipement. Et `equipmentDrops`
 * porte toujours autant d'entrées que de passages — la pièce est garantie.
 */
export const towerSweepResponseSchema = z.object({
  runs: z.number().int(),
  totalGold: z.number().int(),
  totalDust: z.number().int(),
  totalXp: z.number().int(),
  equipmentDrops: z.array(towerEquipmentDropSchema),
})

// Même forme que `simulatorUnitSchema` de campaign.schema.ts (type
// `SimulatorUnit` partagé, battle-simulator.domain.ts) — non exporté
// là-bas, donc redéfini ici plutôt qu'importé.
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

export const towerBattleResponseSchema = z.object({
  won: z.boolean(),
  log: z.array(z.unknown()),
  rewards: towerBattleRewardsSchema.nullable(),
  teamA: z.array(simulatorUnitSchema),
  teamB: z.array(simulatorUnitSchema),
})
