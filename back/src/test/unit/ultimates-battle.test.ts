import { describe, expect, it } from '@jest/globals'

import {
  type LogEntry,
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'
import {
  ULTIMATE_SHIELD_CAP_PCT,
  ULTIMATES,
} from '../../main/domain/combat/ultimates'

/**
 * Unités « de laboratoire » : PV énormes pour qu'aucune ne meure, DEF nulle,
 * pas de critique. Les combats finissent en TIMEOUT et on lit le journal.
 */
function unit(id: string, overrides: Partial<SimulatorUnit> = {}): SimulatorUnit {
  return {
    id,
    hp: 100000,
    atk: 100,
    def: 0,
    spd: 100,
    critRate: 0,
    critDmg: 150,
    armorPen: 0,
    lifesteal: 0,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
    archetype: null,
    ...overrides,
  }
}

type AttackEntry = Extract<LogEntry, { type: 'ATTACK' }>
type PassiveEntry = Extract<LogEntry, { type: 'PASSIVE' }>
type TurnEndEntry = Extract<LogEntry, { type: 'TURN_END' }>

function attacksOf(log: LogEntry[], id: string): AttackEntry[] {
  return log.filter(
    (e): e is AttackEntry => e.type === 'ATTACK' && e.attackerId === id,
  )
}

function ultimatesOf(log: LogEntry[], id: string): PassiveEntry[] {
  return log.filter(
    (e): e is PassiveEntry =>
      e.type === 'PASSIVE' && e.passive === 'ULTIMATE' && e.unitId === id,
  )
}

function lastShieldOf(log: LogEntry[], id: string): number | null {
  let value: number | null = null
  for (const e of log) {
    if (e.type !== 'TURN_END') {
      continue
    }
    const s = (e as TurnEndEntry).statuses?.[id]?.find((x) => x.key === 'SHIELD')
    if (s) {
      value = s.value ?? null
    }
  }
  return value
}

const run = (teamA: SimulatorUnit[], teamB: SimulatorUnit[], timeoutTurns = 30) =>
  simulateBattle({ teamA, teamB, seed: 'ultime', timeoutTurns })

describe('ultime en combat', () => {
  it('MAGE : la 3e action frappe les trois ennemis et est marquée ultime, pas les deux premières', () => {
    const { log } = run(
      [unit('A0', { archetype: 'MAGE' })],
      [unit('B0'), unit('B1'), unit('B2')],
    )
    const [first, second, third] = attacksOf(log, 'A0')
    expect(first?.targetIds).toHaveLength(1)
    expect(first?.ultimate).toBeUndefined()
    expect(second?.targetIds).toHaveLength(1)
    expect(second?.ultimate).toBeUndefined()
    expect(third?.targetIds).toHaveLength(3)
    expect(third?.ultimate).toBe('MAGE')
  })

  it('ASSASSIN (cadence 2) : la 2e action donne deux entrées ATTACK ultimes sur la même cible', () => {
    const { log } = run([unit('A0', { archetype: 'ASSASSIN' })], [unit('B0')])
    const attacks = attacksOf(log, 'A0')
    expect(attacks[0]?.ultimate).toBeUndefined()
    expect(attacks[1]?.ultimate).toBe('ASSASSIN')
    expect(attacks[2]?.ultimate).toBe('ASSASSIN')
    expect(attacks[1]?.targetIds).toEqual(attacks[2]?.targetIds)
    expect(attacks[3]?.ultimate).toBeUndefined()
    expect(attacks[4]?.ultimate).toBe('ASSASSIN')
  })

  it('ASSASSIN face à trois ennemis : les deux coups de l ultime visent la même cible', () => {
    // Trois ennemis à PV énormes et vitesse nulle : seul A0 agit, et sur 20
    // graines le tirage de cible aurait toutes les chances de diverger si le
    // second coup re-tirait une cible.
    for (let k = 0; k < 20; k++) {
      const { log } = simulateBattle({
        teamA: [unit('A0', { archetype: 'ASSASSIN' })],
        teamB: [unit('B0', { spd: 1 }), unit('B1', { spd: 1 }), unit('B2', { spd: 1 })],
        seed: `assassin-${k}`,
        timeoutTurns: 12,
      })
      const ults = attacksOf(log, 'A0').filter((e) => e.ultimate === 'ASSASSIN')
      expect(ults.length).toBeGreaterThanOrEqual(2)
      for (let i = 0; i + 1 < ults.length; i += 2) {
        expect(ults[i + 1]?.targetIds).toEqual(ults[i]?.targetIds)
      }
    }
  })

  it('RANGER face à un seul ennemi : une cible, toujours marqué ultime', () => {
    const { log } = run([unit('A0', { archetype: 'RANGER' })], [unit('B0')])
    const third = attacksOf(log, 'A0')[2]
    expect(third?.targetIds).toHaveLength(1)
    expect(third?.ultimate).toBe('RANGER')
  })

  it('FIGHTER : les dégâts de la 3e action valent valuePct % de la 1re, à la variance près', () => {
    const { log } = run([unit('A0', { archetype: 'FIGHTER' })], [unit('B0')])
    const [first, , third] = attacksOf(log, 'A0')
    const ratio = (third?.damages[0]?.raw ?? 0) / (first?.damages[0]?.raw ?? 1)
    const mult = ULTIMATES.FIGHTER.compute(1).valuePct / 100
    expect(ratio).toBeGreaterThan((mult * 0.9) / 1.1)
    expect(ratio).toBeLessThan((mult * 1.1) / 0.9)
  })

  it("TANK (cadence 4) : pas d'ATTACK à la 4e action ; bouclier posé sur chaque allié vivant, lanceur compris", () => {
    const { log } = run(
      [
        unit('A0', { archetype: 'TANK', hp: 1000 }),
        unit('A1', { hp: 1000 }),
        unit('A2', { hp: 1000 }),
      ],
      [unit('B0', { atk: 0 })],
    )
    const ults = ultimatesOf(log, 'A0')
    const header = ults[0]
    expect(header?.targetId).toBeUndefined()
    const perAlly = ults.slice(1, 4)
    expect(perAlly.map((e) => e.targetId).sort()).toEqual(['A0', 'A1', 'A2'])
    const expected = Math.round((1000 * ULTIMATES.TANK.compute(1).valuePct) / 100)
    for (const e of perAlly) {
      expect(e.payload.shield).toBe(expected)
    }
    const headerIndex = log.indexOf(header as LogEntry)
    const attacksBefore = attacksOf(log.slice(0, headerIndex), 'A0')
    expect(attacksBefore).toHaveLength(3)
  })

  it('TANK : le bouclier est plafonné à ULTIMATE_SHIELD_CAP_PCT % des PV max', () => {
    const { log } = run(
      [unit('A0', { archetype: 'TANK', hp: 1000, palier: 6 }), unit('A1', { hp: 1000 })],
      [unit('B0', { atk: 0 })],
      200,
    )
    const cap = Math.round((1000 * ULTIMATE_SHIELD_CAP_PCT) / 100)
    const received = ultimatesOf(log, 'A0')
      .filter((e) => e.targetId === 'A1')
      .reduce((sum, e) => sum + (e.payload.shield ?? 0), 0)
    expect(received).toBeLessThanOrEqual(cap)
    expect(received).toBeGreaterThan(0)
    expect(lastShieldOf(log, 'A1')).toBeLessThanOrEqual(cap)
  })

  it("TANK : un allié BULWARK au-dessus du plafond ne reçoit rien et garde son bouclier", () => {
    const { log } = run(
      [
        unit('A0', { archetype: 'TANK', hp: 1000 }),
        unit('A1', { hp: 1000, passiveKey: 'BULWARK', palier: 6 }),
      ],
      [unit('B0', { atk: 0 })],
    )
    const toA1 = ultimatesOf(log, 'A0').filter((e) => e.targetId === 'A1')
    expect(toA1.length).toBeGreaterThan(0)
    for (const e of toA1) {
      expect(e.payload.shield).toBe(0)
    }
    expect(lastShieldOf(log, 'A1')).toBe(610)
  })

  it('SUPPORT : soigne les alliés blessés de valuePct % de leurs PV max, borné aux PV manquants', () => {
    const { log } = run(
      [unit('A0', { archetype: 'SUPPORT', hp: 1000 }), unit('A1', { hp: 1000 })],
      [unit('B0', { atk: 100 })],
      60,
    )
    const heals = ultimatesOf(log, 'A0').filter((e) => e.targetId !== undefined)
    expect(heals.length).toBeGreaterThan(0)
    const max = Math.round((1000 * ULTIMATES.SUPPORT.compute(1).valuePct) / 100)
    for (const e of heals) {
      expect(e.payload.healed).toBeGreaterThan(0)
      expect(e.payload.healed).toBeLessThanOrEqual(max)
    }
  })

  it('jauge : le statut ULTIMATE suit les actions jouées et retombe à 0 après l ultime', () => {
    const { log } = run([unit('A0', { archetype: 'MAGE' })], [unit('B0', { spd: 1 })])
    const gauges: Array<{ value?: number; turns?: number } | undefined> = []
    for (const e of log) {
      if (e.type === 'TURN_END') {
        gauges.push((e as TurnEndEntry).statuses?.A0?.find((s) => s.key === 'ULTIMATE'))
      }
    }
    // Seul A0 agit (B0 est quasi immobile) : un TURN_END par action de A0.
    expect(gauges.slice(0, 6).map((g) => g?.value)).toEqual([1, 2, 0, 1, 2, 0])
    expect(gauges[0]?.turns).toBe(3)
  })

  it("jauge : un ennemi sans archétype n'a jamais de statut ULTIMATE", () => {
    const { log } = run([unit('A0', { archetype: 'MAGE' })], [unit('B0')])
    for (const e of log) {
      if (e.type === 'TURN_END') {
        expect((e as TurnEndEntry).statuses?.B0?.some((s) => s.key === 'ULTIMATE') ?? false).toBe(false)
      }
    }
  })

  it("jauge : une action sautée par STUN ne charge pas l'ultime", () => {
    // B0 porte STUN au palier 6 (65 % de chance) et frappe vite : A0 saute
    // des actions. Sur chacune, sa charge d'ultime ne doit pas bouger.
    const { log } = run(
      [unit('A0', { archetype: 'MAGE', hp: 100000 })],
      [unit('B0', { passiveKey: 'STUN', palier: 6, spd: 300 })],
      40,
    )
    let skipped = 0
    let lastGauge: number | undefined
    for (const e of log) {
      if (e.type === 'PASSIVE' && e.passive === 'STUN' && e.unitId === 'A0' && e.payload.skipped) {
        skipped++
        // L'entrée TURN_END qui suit porte la jauge inchangée.
        const idx = log.indexOf(e)
        const turnEnd = log.slice(idx).find((x) => x.type === 'TURN_END') as TurnEndEntry | undefined
        const gauge = turnEnd?.statuses?.A0?.find((s) => s.key === 'ULTIMATE')?.value ?? 0
        expect(gauge).toBe(lastGauge ?? 0)
      }
      if (e.type === 'TURN_END') {
        lastGauge = (e as TurnEndEntry).statuses?.A0?.find((s) => s.key === 'ULTIMATE')?.value ?? 0
      }
    }
    expect(skipped).toBeGreaterThan(0)
  })

  it("SUPPORT : part à vide quand personne n'est blessé", () => {
    const { log } = run(
      [unit('A0', { archetype: 'SUPPORT', hp: 1000 }), unit('A1', { hp: 1000 })],
      [unit('B0', { atk: 0 })],
    )
    const ults = ultimatesOf(log, 'A0')
    expect(ults.length).toBeGreaterThan(0)
    expect(ults.every((e) => e.targetId === undefined)).toBe(true)
    const headerIndex = log.indexOf(ults[0] as LogEntry)
    expect(attacksOf(log.slice(0, headerIndex), 'A0')).toHaveLength(3)
    expect(
      log
        .slice(headerIndex, headerIndex + 3)
        .some((e) => e.type === 'ATTACK' && e.attackerId === 'A0'),
    ).toBe(false)
  })

  it("une unité sans archétype n'a jamais d'ultime", () => {
    const { log } = run([unit('A0', { archetype: 'MAGE' })], [unit('B0'), unit('B1')])
    expect(attacksOf(log, 'B0').some((e) => e.ultimate)).toBe(false)
    expect(ultimatesOf(log, 'B0')).toHaveLength(0)
  })

  it('déterminisme : même graine, même journal', () => {
    const teams = () => [
      [unit('A0', { archetype: 'MAGE' }), unit('A1', { archetype: 'TANK' })],
      [unit('B0'), unit('B1', { archetype: 'SUPPORT' })],
    ]
    const [a1, b1] = teams()
    const [a2, b2] = teams()
    expect(run(a1 as SimulatorUnit[], b1 as SimulatorUnit[]).log).toEqual(
      run(a2 as SimulatorUnit[], b2 as SimulatorUnit[]).log,
    )
  })

  it('la cadence compte les actions jouées : CRIT et ultime coïncident à la 6e', () => {
    const { log } = run(
      [unit('A0', { archetype: 'MAGE', passiveKey: 'CRIT' })],
      [unit('B0'), unit('B1')],
    )
    const sixth = attacksOf(log, 'A0')[5]
    expect(sixth?.ultimate).toBe('MAGE')
    expect(sixth?.damages.every((d) => d.crit)).toBe(true)
  })
})
