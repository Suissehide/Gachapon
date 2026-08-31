import { describe, expect, it } from '@jest/globals'

import {
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'
import {
  computeFinalStats,
  mitigationRefFor,
} from '../../main/domain/combat/combat-stats.domain'

// Profils médians mesurés sur le classeur de production, rareté Épique.
const PROFILS = {
  Assassin: { baseHp: 254, baseAtk: 44, baseDef: 11, baseSpd: 117 },
  Mage: { baseHp: 252, baseAtk: 49, baseDef: 12, baseSpd: 98 },
  Tireur: { baseHp: 282, baseAtk: 42, baseDef: 13, baseSpd: 106 },
  Combattant: { baseHp: 354, baseAtk: 35, baseDef: 17, baseSpd: 96 },
  Tank: { baseHp: 408, baseAtk: 25, baseDef: 22, baseSpd: 88 },
  Soutien: { baseHp: 366, baseAtk: 33, baseDef: 18, baseSpd: 95 },
} as const

const NIVEAU = 70
const PALIER = 7

function unite(id: string, profil: keyof typeof PROFILS): SimulatorUnit {
  const base = PROFILS[profil]
  const stats = computeFinalStats({
    ...base, level: NIVEAU, palier: PALIER, variant: 'NORMAL',
  })
  return {
    id,
    ...stats,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: PALIER,
    level: NIVEAU,
    mitigationRef: mitigationRefFor({
      level: NIVEAU, palier: PALIER, variant: 'NORMAL', defMitigationRef: 100,
    }),
  }
}

function longueurMediane(
  a: readonly (keyof typeof PROFILS)[],
  b: readonly (keyof typeof PROFILS)[],
): number {
  const tours = Array.from({ length: 25 }, (_, i) =>
    simulateBattle({
      seed: `longueur-${i}`,
      teamA: a.map((p, idx) => unite(`A${idx}`, p)),
      teamB: b.map((p, idx) => unite(`B${idx}`, p)),
    }).turns,
  ).sort((x, y) => x - y)
  return tours[Math.floor(tours.length / 2)]
}

const OFFENSIVE = ['Assassin', 'Mage', 'Tireur'] as const
const DEFENSIVE = ['Tank', 'Soutien', 'Combattant'] as const

describe('longueur des combats en endgame', () => {
  it('un miroir offensif se règle en moins de 45 actions', () => {
    expect(longueurMediane(OFFENSIVE, OFFENSIVE)).toBeLessThan(45)
  })

  it('le pire cas (défensive vs défensive) reste sous 90 actions', () => {
    // Avant la correction de la constante de mitigation : 169 actions.
    expect(longueurMediane(DEFENSIVE, DEFENSIVE)).toBeLessThan(90)
  })

  it('aucun matchup ne part en TIMEOUT', () => {
    for (const a of [OFFENSIVE, DEFENSIVE]) {
      for (const b of [OFFENSIVE, DEFENSIVE]) {
        const r = simulateBattle({
          seed: 'timeout',
          teamA: a.map((p, i) => unite(`A${i}`, p)),
          teamB: b.map((p, i) => unite(`B${i}`, p)),
        })
        expect(r.won).not.toBeNull()
      }
    }
  })
})
