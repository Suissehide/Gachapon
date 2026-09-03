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
  'set.fureurCritDmgPct': 35,
  'set.precisionCritRatePct': 25,
  'set.sangsueLifestealPct': 16,
  'set.perceeArmorPenPct': 20,
  'set.assautAtkPct': 16,
  'set.colosseHpPct': 12,
  'set.celeriteSpdPct': 8,
})

function fureurPiece(): EquippedPiece {
  return { bonuses: { atkFlat: 1 }, level: 1, substats: [], baseBoost: 0, setKey: 'FUREUR' }
}

// Assaut est un set de 3 pièces qui donne de l'ATQ en pourcentage — c'est lui
// qui sert à prouver qu'un bonus de set multiplicatif atteint bien les stats
// classiques, rôle que tenait l'ancien palier 2 de Fureur.
function assautPiece(): EquippedPiece {
  return { bonuses: { atkFlat: 1 }, level: 1, substats: [], baseBoost: 0, setKey: 'ASSAUT' }
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
    // atk : base 20 + 4×atkFlat(1) = 24. Fureur ne donne pas d'ATQ.
    expect(stats.atk).toBe(24)
    // critDmg : stat de stuff, purement additive — base 150 + 35 (set complet)
    expect(stats.critDmg).toBe(185)
  })

  it('applique un bonus de set multiplicatif aux stats classiques (3-set Assaut)', () => {
    const stats = computeEquippedCardStats({
      ...BASE,
      pieces: [assautPiece(), assautPiece(), assautPiece()],
      setDefs,
      baseStats: BASES_COMBAT,
    })
    // atk : base 20 + 3×atkFlat(1) = 23, ×(1 + 16 %) = 26.68 → 27
    expect(stats.atk).toBe(27)
  })

  it('sans set complet (3 pièces sur un set qui en demande 4), seuls les bonus pièce par pièce s appliquent', () => {
    const stats = computeEquippedCardStats({
      ...BASE,
      pieces: [fureurPiece(), fureurPiece(), fureurPiece()],
      setDefs,
      baseStats: BASES_COMBAT,
    })
    // atk : base 20 + 3×1 = 23, aucun bonus de set (Fureur exige 4 pièces).
    expect(stats.atk).toBe(23)
    expect(stats.critDmg).toBe(150)
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
