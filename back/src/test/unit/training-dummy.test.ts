import { describe, expect, it } from '@jest/globals'

import {
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'
import {
  DUMMY_TURNS,
  type DummySpec,
  damageTaken,
  trainingDummyUnit,
} from '../../main/domain/combat/training-dummy.domain'

const PASSIVE_DUMMY: DummySpec = {
  element: null,
  def: 0,
  atk: 0,
  attackPattern: 'BASIC',
}

function ally(id: string, overrides: Partial<SimulatorUnit> = {}): SimulatorUnit {
  return {
    id,
    hp: 200,
    atk: 30,
    def: 10,
    spd: 100,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
    critRate: 5,
    critDmg: 150,
    armorPen: 0,
    lifesteal: 0,
    ...overrides,
  }
}

describe('training dummy', () => {
  const run = (teamA: SimulatorUnit[], spec: DummySpec = PASSIVE_DUMMY) => {
    const dummy = trainingDummyUnit(spec, 0)
    const sim = simulateBattle({
      teamA,
      teamB: [dummy],
      seed: 'dummy',
      timeoutTurns: DUMMY_TURNS,
    })
    // Rejoue le journal comme la scène : PV restants du mannequin.
    return { ...sim, dealt: damageTaken(sim.log, dummy.id) }
  }

  it('ne meurt pas, ne blesse personne et finit au chrono', () => {
    const sim = run([ally('A0'), ally('A1'), ally('A2')])
    expect(sim.won).toBeNull()
    expect(sim.log.at(-1)).toEqual({ type: 'TIMEOUT' })
    expect(damageTaken(sim.log, 'A0')).toBe(0)
    expect(sim.dealt).toBeGreaterThan(0)
  })

  it('compte les DoT et monte avec l’ATK', () => {
    const weak = run([ally('A0')]).dealt
    const strong = run([ally('A0', { atk: 60 })]).dealt
    expect(strong).toBeGreaterThan(weak * 1.5)

    const burn = run([ally('A0', { passiveKey: 'BURN' })])
    const ticks = burn.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'BURN' && e.unitId === 'B0',
    )
    expect(ticks.length).toBeGreaterThan(0)
    const hits = burn.log
      .flatMap((e) => (e.type === 'ATTACK' ? e.damages : []))
      .reduce((s, d) => s + d.final, 0)
    expect(burn.dealt).toBeGreaterThan(hits)
  })

  it('sa DEF réduit les dégâts comme celle d’un ennemi', () => {
    const plain = run([ally('A0', { critRate: 0 })]).dealt
    const armored = run([ally('A0', { critRate: 0 })], {
      ...PASSIVE_DUMMY,
      // DEF = seuil K : la moitié des dégâts passe.
      def: 1000,
    }).dealt
    expect(armored / plain).toBeCloseTo(0.5, 1)
  })

  it('riposte quand on lui donne de l’ATK', () => {
    const sim = run([ally('A0')], { ...PASSIVE_DUMMY, atk: 30 })
    expect(damageTaken(sim.log, 'A0')).toBeGreaterThan(0)
  })
})
