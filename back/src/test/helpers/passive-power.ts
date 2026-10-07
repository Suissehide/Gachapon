/**
 * Valeur d'un passif exprimée en stats d'équipe. On mesure le taux de
 * victoire d'une équipe dont la première carte porte le passif, PV et ATQ
 * multipliés par `h`, contre la même équipe sans passif. Profils endgame de
 * combat-length.test.ts (niveau 70, palier 7).
 *
 * Partagé par le garde-fou passive-power.test.ts et par
 * scripts/passive-bench.ts (calibration).
 */
import {
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'
import {
  computeFinalStats,
  mitigationRefFor,
} from '../../main/domain/combat/combat-stats.domain'

const PROFILS = {
  Mage: { baseHp: 252, baseAtk: 61, baseDef: 30, baseSpd: 98 },
  Combattant: { baseHp: 354, baseAtk: 44, baseDef: 43, baseSpd: 96 },
  Tank: { baseHp: 408, baseAtk: 31, baseDef: 55, baseSpd: 88 },
  Soutien: { baseHp: 366, baseAtk: 41, baseDef: 45, baseSpd: 95 },
} as const

/** Mixte : combats courts. Défensive : combats longs, où soins et DoT pèsent plus. */
export const COMPS = {
  mixte: ['Mage', 'Combattant', 'Soutien'],
  defensive: ['Soutien', 'Tank', 'Combattant'],
} as const
export type Comp = keyof typeof COMPS

function unite(
  id: string,
  profil: keyof typeof PROFILS,
  passiveKey: string | null,
  h: number,
): SimulatorUnit {
  const stats = computeFinalStats({
    ...PROFILS[profil],
    level: 70,
    palier: 7,
    variant: 'NORMAL',
    baseStats: { critRate: 5, critDmg: 150, armorPen: 0, lifesteal: 0 },
  })
  return {
    id,
    ...stats,
    hp: Math.round(stats.hp * h),
    atk: Math.round(stats.atk * h),
    attackPattern: 'BASIC',
    passiveKey,
    palier: 7,
    level: 70,
    mitigationRef: mitigationRefFor({
      level: 70,
      palier: 7,
      variant: 'NORMAL',
      defMitigationRef: 100,
    }),
  }
}

export function passiveWinRate(
  key: string,
  comp: Comp,
  h: number,
  battles: number,
): number {
  const profils = COMPS[comp]
  let wins = 0
  for (let i = 0; i < battles; i++) {
    const r = simulateBattle({
      seed: `bench-${i}`,
      teamA: profils.map((p, idx) => unite(`A${idx}`, p, idx === 0 ? key : null, h)),
      teamB: profils.map((p, idx) => unite(`B${idx}`, p, null, 1)),
    })
    if (r.won === 'A') {
      wins++
    }
  }
  return wins / battles
}

/** Bonus de stats d'équipe (en %) qui équivaut au passif : handicap au seuil des 50 %. */
export function passiveValuePct(key: string, comp: Comp, battles = 300): number {
  let lo = 0.2
  let hi = 1.3
  for (let k = 0; k < 12; k++) {
    const m = (lo + hi) / 2
    if (passiveWinRate(key, comp, m, battles) >= 0.5) {
      hi = m
    } else {
      lo = m
    }
  }
  return (1 / hi - 1) * 100
}
