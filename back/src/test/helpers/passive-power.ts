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
import { computeFinalStats } from '../../main/domain/combat/combat-stats.domain'
import { towerFloorScale } from '../../main/domain/content/tower.definitions'
import {
  campaignEnemies,
  campaignProfile,
  counterPickElement,
  referenceTeam,
  towerEnemiesAtScale,
  towerFloorProfile,
} from '../../../prisma/seed/balance-calibration'

export const PROFILS = {
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
    finishes: [],
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

/**
 * Banc ÉQUIPÉ : l'équipe de référence de cet étage de tour (stuff réel,
 * sous-stats tirées) face à l'étage tel qu'il est livré. Le miroir sans
 * stuff ci-dessus sous-estime ce qui grandit avec les dégâts (vol de vie,
 * redirection vers un tank) et surestime les pourcentages fixes (soins, DoT).
 */
export const GEARED_FLOOR = 15
/**
 * Point de mi-parcours : le joueur de référence de 10-5 (niveau 57, pièces
 * peu communes n12) face à cet étage relevé de 16 % pour partir de 50 % de
 * victoire. Les combats y sont plus longs qu'au sommet, les effets par
 * action y pèsent plus.
 */
export const MIDGAME_STAGE = { chapter: 10, index: 5, mult: 1.16 } as const

export type GearedBench = 'tower' | 'campaign'

function gearedMatchup(bench: GearedBench, seed: number) {
  if (bench === 'campaign') {
    const { chapter, index, mult } = MIDGAME_STAGE
    const enemies = campaignEnemies(chapter, index, mult)
    return {
      profile: campaignProfile(chapter, index),
      element: counterPickElement(enemies),
      enemies,
      seed: `midgame-${seed}`,
    }
  }
  return {
    profile: towerFloorProfile(GEARED_FLOOR),
    element: 'WATER',
    enemies: towerEnemiesAtScale(GEARED_FLOOR, towerFloorScale(GEARED_FLOOR), 0),
    seed: `geared-${seed}`,
  }
}

export function gearedWinRate(
  key: string | null,
  slot: number,
  h: number,
  battles: number,
  bench: GearedBench = 'tower',
): number {
  let wins = 0
  for (let i = 0; i < battles; i++) {
    const { profile, element, enemies, seed } = gearedMatchup(bench, i)
    const teamA = referenceTeam(profile, { element, seed: 1000 + i }).map(
      (u, idx): SimulatorUnit => ({
        ...u,
        hp: Math.round(u.hp * h),
        atk: Math.round(u.atk * h),
        passiveKey: idx === slot ? key : null,
      }),
    )
    const r = simulateBattle({
      seed,
      teamA,
      teamB: enemies,
      elementAdvantageMult: 1.3,
      elementDisadvantageMult: 1 / 1.3,
      defenseK: 1000,
    })
    if (r.won === 'A') {
      wins++
    }
  }
  return wins / battles
}

/** Même mesure que `passiveValuePct`, sur le banc équipé ; `slot` = carte porteuse (0 Mage, 1 Combattant, 2 Soutien). */
export function gearedPassiveValuePct(
  key: string,
  slot: number,
  battles = 300,
  bench: GearedBench = 'tower',
): number {
  const base = gearedWinRate(null, slot, 1, battles, bench)
  if (gearedWinRate(key, slot, 1, battles, bench) <= base) {
    return 0
  }
  let lo = 0.4
  let hi = 1
  for (let k = 0; k < 9; k++) {
    const m = (lo + hi) / 2
    if (gearedWinRate(key, slot, m, battles, bench) >= base) {
      hi = m
    } else {
      lo = m
    }
  }
  return (1 / hi - 1) * 100
}
