import { describe, expect, it } from '@jest/globals'

import {
  computeEquippedCardStats,
  type EquippedPiece,
} from '../../main/domain/combat/equipped-card-stats'
import { setBonusesFromConfig } from '../../main/domain/equipment/set-bonuses'

const BASE = {
  baseHp: 200,
  baseAtk: 20,
  baseDef: 10,
  baseSpd: 100,
  level: 1,
  palier: 1,
  variant: 'NORMAL' as const,
}

const BASES_COMBAT = { critRate: 5, critDmg: 150, armorPen: 0, lifesteal: 0 }

const setDefs = setBonusesFromConfig({
  'set.fureur2AtkPct': 10, 'set.fureur4CritDmgPct': 25,
  'set.precision2SpdPct': 8, 'set.precision4CritRatePct': 20,
  'set.percee2DefPct': 10, 'set.percee4ArmorPenPct': 25,
  'set.sangsue2HpPct': 12, 'set.sangsue4LifestealPct': 12,
})

function fureurPiece(): EquippedPiece {
  return { bonuses: { atkFlat: 1 }, level: 1, substats: [], baseBoost: 0, setKey: 'FUREUR' }
}

describe('equipped-card-stats: computeEquippedCardStats', () => {
  // Preuve que c'est bien le CONSTRUCTEUR d'unité (via cette fonction, extraite
  // de campaign.domain.ts#buildPlayerSimUnits et combat-team.tx.ts#buildTeamView)
  // qui applique le bonus de set — pas seulement que set-bonuses.ts sait le
  // calculer. Une carte à 4 pièces Fureur touche ses deux paliers en plus de
  // ses bonus d'équipement pièce par pièce.
  it('applique le bonus d équipement ET le bonus de set (4-set Fureur) sur une carte à 4 pièces', () => {
    const stats = computeEquippedCardStats({
      ...BASE,
      pieces: [fureurPiece(), fureurPiece(), fureurPiece(), fureurPiece()],
      setDefs,
      baseStats: BASES_COMBAT,
    })
    // atk : base 20 + 4×atkFlat(1) = 24, ×(1 + 10%/palier 2) = 26.4 → 26
    expect(stats.atk).toBe(26)
    // critDmg : stat de stuff, purement additive — base 150 + 25 (palier 4)
    expect(stats.critDmg).toBe(175)
  })

  it('sans set complet (3 pièces), seuls les bonus d équipement pièce par pièce s appliquent', () => {
    const stats = computeEquippedCardStats({
      ...BASE,
      pieces: [fureurPiece(), fureurPiece(), fureurPiece()],
      setDefs,
      baseStats: BASES_COMBAT,
    })
    // atk : base 20 + 3×1 = 23, palier 2 déclenché (3 >= 2 pièces) -> 23 × 1.10 = 25.3 -> 25
    expect(stats.atk).toBe(25)
    expect(stats.critDmg).toBe(150) // pas de palier 4
  })

  it('sans aucune pièce, seules les stats de base s appliquent', () => {
    const stats = computeEquippedCardStats({
      ...BASE,
      pieces: [],
      setDefs,
      baseStats: BASES_COMBAT,
    })
    expect(stats.atk).toBe(20)
    expect(stats.critDmg).toBe(150)
  })
})
