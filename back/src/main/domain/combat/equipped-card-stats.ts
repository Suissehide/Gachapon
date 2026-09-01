// Stats finales d'une carte équipée : combine les bonus d'équipement pièce
// par pièce et le bonus de set agrégé pour CETTE carte (comptage par carte —
// voir set-bonuses.ts). Extrait des constructeurs d'unités (campaign.domain.ts,
// combat-team.tx.ts) pour être testable sans DB : c'est la fonction que ces
// deux constructeurs appellent réellement, pas une réimplémentation parallèle
// à des fins de test.

import type { CardVariant } from '../../types/domain/gacha/gacha.types'
import {
  effectiveEquipmentBonuses,
  type Substat,
} from '../equipment/equipment-progression'
import {
  computeSetBonuses,
  type SetDefinition,
  type SetKey,
} from '../equipment/set-bonuses'
import {
  type CombatStats,
  type CombatStatsBaseline,
  computeFinalStats,
  type EquipmentBonuses,
} from './combat-stats.domain'

/** Une pièce d'équipement telle que portée par une carte : juste assez de
 * champs pour calculer son bonus effectif ET son appartenance à un set. */
export interface EquippedPiece {
  bonuses: Record<string, number>
  level: number
  substats: Substat[]
  baseBoost: number
  setKey: string
}

export interface EquippedCardStatsInput {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  level: number
  palier: number
  variant: CardVariant
  /** Les pièces portées par CETTE carte — le comptage de set est par carte. */
  pieces: EquippedPiece[]
  setDefs: Record<SetKey, SetDefinition>
  baseStats: CombatStatsBaseline
}

export function computeEquippedCardStats(
  input: EquippedCardStatsInput,
): CombatStats {
  const { pieces, setDefs, ...rest } = input
  const equipmentBonuses: EquipmentBonuses[] = pieces.map(
    (p) =>
      effectiveEquipmentBonuses(
        p.bonuses,
        p.level,
        p.substats,
        p.baseBoost,
      ) as EquipmentBonuses,
  )
  const setBonus = computeSetBonuses(
    pieces.map((p) => p.setKey),
    setDefs,
  )
  return computeFinalStats({
    ...rest,
    equipment: [...equipmentBonuses, setBonus],
  })
}
