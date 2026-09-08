import { z } from 'zod/v4'

import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { enemyNameFromAppearance } from '../campaign/enemy-appearance'
import { computeEquippedCardStats } from '../combat/equipped-card-stats'
import type { Substat } from '../equipment/equipment-progression'
import type { SetDefinition, SetKey } from '../equipment/set-bonuses'
import type { AttackPattern, SimulatorUnit } from './battle-simulator.domain'
import {
  type CombatStatsBaseline,
  computeFinalStats,
  mitigationRefFor,
} from './combat-stats.domain'

/**
 * Un ennemi stocké en JSON (TowerFloor.enemyTeam, RaidBoss.spec). Même
 * schéma que CampaignStage.enemyTeam : mitigationScale obligatoire (les
 * ennemis sont seedés à level 1 / palier 1, leur puissance étant pré-cuite
 * via ce facteur), stats de stuff optionnelles.
 */
export const enemySpecSchema = z.object({
  baseHp: z.number(),
  baseAtk: z.number(),
  baseDef: z.number(),
  baseSpd: z.number(),
  level: z.number(),
  palier: z.number(),
  attackPattern: z
    .enum(['BASIC', 'AOE_3', 'MULTI_2', 'MONO_AMPLIFIED', 'MONO_DOUBLE'])
    .optional(),
  passiveKey: z.string().nullish(),
  element: z.string().nullish(),
  appearance: z.string().nullish(),
  mitigationScale: z.number(),
  critRate: z.number().optional(),
  critDmg: z.number().optional(),
  armorPen: z.number().optional(),
  lifesteal: z.number().optional(),
})
export type EnemySpec = z.infer<typeof enemySpecSchema>

/**
 * SimulatorUnit des cartes du joueur, dans l'ordre demandé, en ignorant les
 * ids qui ne lui appartiennent pas. Lit dans la transaction courante.
 */
export async function buildPlayerSimUnits(
  tx: PrimaTransactionClient,
  opts: {
    userId: string
    userCardIds: string[]
    defMitigationRef: number
    baseStats: CombatStatsBaseline
    setDefs: Record<SetKey, SetDefinition>
    publicUrl: (key: string) => string
  },
): Promise<SimulatorUnit[]> {
  const userCards = await tx.userCard.findMany({
    where: { id: { in: opts.userCardIds }, userId: opts.userId },
    include: {
      card: { include: { set: true } },
      equipment: { include: { equipment: true } },
    },
  })
  const byId = new Map(userCards.map((u) => [u.id, u]))
  return opts.userCardIds
    .map((id) => byId.get(id))
    .filter((u): u is NonNullable<typeof u> => u != null)
    .map((u, idx) => {
      const stats = computeEquippedCardStats({
        baseHp: u.card.baseHp,
        baseAtk: u.card.baseAtk,
        baseDef: u.card.baseDef,
        baseSpd: u.card.baseSpd,
        level: u.level,
        palier: u.palier,
        variant: u.variant,
        pieces: u.equipment.map((ue) => ({
          bonuses: (ue.equipment.bonuses ?? {}) as Record<string, number>,
          level: ue.level,
          substats: (ue.substats ?? []) as unknown as Substat[],
          baseBoost: ue.baseBoost,
          setKey: ue.equipment.setKey,
        })),
        setDefs: opts.setDefs,
        baseStats: opts.baseStats,
      })
      return {
        id: `A${idx}`,
        name: u.card.name,
        imageUrl: u.card.imageUrl ? opts.publicUrl(u.card.imageUrl) : null,
        rarity: u.card.rarity,
        variant: u.variant,
        setName: u.card.set?.name ?? null,
        level: u.level,
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
        critRate: stats.critRate,
        critDmg: stats.critDmg,
        armorPen: stats.armorPen,
        lifesteal: stats.lifesteal,
        attackPattern: 'BASIC' as AttackPattern,
        passiveKey: u.card.passiveKey,
        element: u.card.element,
        palier: u.palier,
        mitigationRef: mitigationRefFor({
          level: u.level,
          palier: u.palier,
          variant: u.variant,
          defMitigationRef: opts.defMitigationRef,
        }),
      }
    })
}

/**
 * SimulatorUnit des ennemis d'un JSON de spec. mitigationRef =
 * defMitigationRef × e.mitigationScale (jamais dérivé du niveau).
 */
export function buildEnemySimUnits(
  enemyTeam: EnemySpec[],
  opts: {
    defMitigationRef: number
    baseStats: CombatStatsBaseline
    resolveImage: (appearance: string | null | undefined) => string | null
  },
): SimulatorUnit[] {
  return enemyTeam.map((e, idx) => {
    const stats = computeFinalStats({
      baseHp: e.baseHp,
      baseAtk: e.baseAtk,
      baseDef: e.baseDef,
      baseSpd: e.baseSpd,
      level: e.level,
      palier: e.palier,
      variant: 'NORMAL',
      baseStats: {
        critRate: e.critRate ?? opts.baseStats.critRate,
        critDmg: e.critDmg ?? opts.baseStats.critDmg,
        armorPen: e.armorPen ?? opts.baseStats.armorPen,
        lifesteal: e.lifesteal ?? opts.baseStats.lifesteal,
      },
    })
    return {
      id: `B${idx}`,
      name: enemyNameFromAppearance(e.appearance) ?? `Ennemi ${idx + 1}`,
      imageUrl: opts.resolveImage(e.appearance),
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      armorPen: stats.armorPen,
      lifesteal: stats.lifesteal,
      attackPattern: e.attackPattern ?? 'BASIC',
      passiveKey: e.passiveKey ?? null,
      element: e.element ?? null,
      palier: e.palier,
      mitigationRef: opts.defMitigationRef * e.mitigationScale,
    }
  })
}
