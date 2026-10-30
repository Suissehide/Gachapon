/**
 * Valeur d'un ultime exprimée en stats d'équipe, même méthode que
 * passive-power.ts : la première carte de l'équipe A porte l'archétype
 * mesuré (les deux autres n'en ont pas), PV et ATQ multipliés par `h`,
 * contre la même équipe sans aucun archétype. Profils endgame de
 * combat-length.test.ts (niveau 70, palier 7).
 *
 * Partagé par le garde-fou ultimate-power.test.ts et par
 * scripts/ultimate-bench.ts (calibration).
 */
import {
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'
import { computeFinalStats } from '../../main/domain/combat/combat-stats.domain'
import type { CardArchetype } from '../../main/types/domain/combat/archetype.types'
import { type Comp, COMPS, PROFILS } from './passive-power'

function unite(
  id: string,
  profil: keyof typeof PROFILS,
  archetype: CardArchetype | null,
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
    passiveKey: null,
    archetype,
    palier: 7,
    level: 70,
  }
}

export function ultimateWinRate(
  archetype: CardArchetype,
  comp: Comp,
  h: number,
  battles: number,
): number {
  const profils = COMPS[comp]
  let wins = 0
  for (let i = 0; i < battles; i++) {
    const r = simulateBattle({
      seed: `ult-bench-${i}`,
      teamA: profils.map((p, idx) =>
        unite(`A${idx}`, p, idx === 0 ? archetype : null, h),
      ),
      teamB: profils.map((p, idx) => unite(`B${idx}`, p, null, 1)),
    })
    if (r.won === 'A') {
      wins++
    }
  }
  return wins / battles
}

/** Bonus de stats d'équipe (en %) qui équivaut à l'ultime : handicap au seuil des 50 %. */
export function ultimateValuePct(
  archetype: CardArchetype,
  comp: Comp,
  battles = 300,
): number {
  let lo = 0.2
  let hi = 1.3
  for (let k = 0; k < 12; k++) {
    const m = (lo + hi) / 2
    if (ultimateWinRate(archetype, comp, m, battles) >= 0.5) {
      hi = m
    } else {
      lo = m
    }
  }
  return (1 / hi - 1) * 100
}
