import { describe, expect, it } from '@jest/globals'

import {
  _internals,
  type AttackPattern,
  type LogEntry,
  type SimulatorInput,
  type SimulatorUnit,
  simulateBattle,
} from '../../main/domain/combat/battle-simulator.domain'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function makeUnit(
  id: string,
  overrides: Partial<SimulatorUnit> = {},
): SimulatorUnit {
  return {
    id,
    hp: 200,
    atk: 30,
    def: 10,
    spd: 100,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
    ...overrides,
  }
}

function mirrorTeams(): { teamA: SimulatorUnit[]; teamB: SimulatorUnit[] } {
  return {
    teamA: [
      makeUnit('A0'),
      makeUnit('A1'),
      makeUnit('A2'),
    ],
    teamB: [
      makeUnit('B0'),
      makeUnit('B1'),
      makeUnit('B2'),
    ],
  }
}

function countLog(log: LogEntry[], type: LogEntry['type']): number {
  return log.filter((e) => e.type === type).length
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('simulateBattle', () => {
  // 1. Determinism
  it('is deterministic for the same seed and inputs', () => {
    const { teamA, teamB } = mirrorTeams()
    const input: SimulatorInput = { teamA, teamB, seed: 'deterministic-seed' }
    const a = simulateBattle(input)
    const b = simulateBattle({
      teamA: mirrorTeams().teamA,
      teamB: mirrorTeams().teamB,
      seed: 'deterministic-seed',
    })
    expect(a.won).toBe(b.won)
    expect(a.turns).toBe(b.turns)
    expect(a.log).toEqual(b.log)
  })

  it('produces different logs for different seeds (sanity check)', () => {
    const r1 = simulateBattle({ ...mirrorTeams(), seed: 'seed-one' })
    const r2 = simulateBattle({ ...mirrorTeams(), seed: 'seed-two' })
    // Not strictly required by spec, but a sanity check on PRNG
    expect(r1.log).not.toEqual(r2.log)
  })

  // 2. 3v3 BASIC battle
  it('3v3 BASIC: produces a winner with WIN entry at end', () => {
    const result = simulateBattle({ ...mirrorTeams(), seed: 'basic-3v3' })
    expect(result.won === 'A' || result.won === 'B').toBe(true)
    const last = result.log[result.log.length - 1]
    expect(last?.type).toBe('WIN')
    if (last && last.type === 'WIN') {
      expect(last.side).toBe(result.won)
    }
    expect(countLog(result.log, 'TURN_END')).toBeGreaterThanOrEqual(1)
  })

  // 3. VIT ordering
  it('highest SPD unit acts first', () => {
    const fast = makeUnit('A0', { spd: 999 })
    const slow1 = makeUnit('B0', { spd: 50 })
    const slow2 = makeUnit('B1', { spd: 40 })
    const result = simulateBattle({
      teamA: [fast],
      teamB: [slow1, slow2],
      seed: 'spd-order',
    })
    const firstAttack = result.log.find((e) => e.type === 'ATTACK')
    expect(firstAttack).toBeDefined()
    if (firstAttack && firstAttack.type === 'ATTACK') {
      expect(firstAttack.attackerId).toBe('A0')
    }
  })

  // 4. AOE_3 hits all 3
  it('AOE_3 boss hits all 3 enemies in one ATTACK entry', () => {
    const boss = makeUnit('A0', {
      hp: 5000,
      atk: 100,
      attackPattern: 'AOE_3',
    })
    const result = simulateBattle({
      teamA: [boss],
      teamB: [makeUnit('B0'), makeUnit('B1'), makeUnit('B2')],
      seed: 'aoe-boss',
    })
    const firstAoe = result.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    expect(firstAoe).toBeDefined()
    if (firstAoe && firstAoe.type === 'ATTACK') {
      expect(firstAoe.targetIds.length).toBe(3)
      expect(firstAoe.damages.length).toBe(3)
    }
    // Boss should eventually win
    expect(result.won).toBe('A')
  })

  // 5. MULTI_2 hits 2 (when ≥2 alive)
  it('MULTI_2 hits 2 enemies', () => {
    const attacker = makeUnit('A0', {
      atk: 50,
      attackPattern: 'MULTI_2',
      spd: 200,
    })
    const result = simulateBattle({
      teamA: [attacker],
      teamB: [makeUnit('B0'), makeUnit('B1'), makeUnit('B2')],
      seed: 'multi-2',
    })
    const firstAtk = result.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    expect(firstAtk).toBeDefined()
    if (firstAtk && firstAtk.type === 'ATTACK') {
      expect(firstAtk.targetIds.length).toBe(2)
    }
  })

  // 6. MONO_AMPLIFIED ~ 2.5x BASIC damage
  it('MONO_AMPLIFIED deals roughly 2.5x BASIC damage on the same seed', () => {
    const seed = 'amp-test'
    const basic = simulateBattle({
      teamA: [makeUnit('A0', { atk: 50, spd: 200 })],
      teamB: [makeUnit('B0', { hp: 100000, def: 10 })],
      seed,
    })
    const amp = simulateBattle({
      teamA: [
        makeUnit('A0', { atk: 50, spd: 200, attackPattern: 'MONO_AMPLIFIED' }),
      ],
      teamB: [makeUnit('B0', { hp: 100000, def: 10 })],
      seed,
    })

    const basicFirst = basic.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    const ampFirst = amp.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    expect(basicFirst?.type).toBe('ATTACK')
    expect(ampFirst?.type).toBe('ATTACK')
    if (
      basicFirst?.type === 'ATTACK' &&
      ampFirst?.type === 'ATTACK'
    ) {
      const basicDmg = basicFirst.damages[0]?.final ?? 0
      const ampDmg = ampFirst.damages[0]?.final ?? 0
      expect(basicDmg).toBeGreaterThan(0)
      const ratio = ampDmg / basicDmg
      expect(ratio).toBeGreaterThan(2.3)
      expect(ratio).toBeLessThan(2.7)
    }
  })

  // 7. MONO_DOUBLE -> 2 ATTACK entries from same attacker per action
  it('MONO_DOUBLE produces 2 separate ATTACK entries from the same attacker', () => {
    const attacker = makeUnit('A0', {
      atk: 20,
      spd: 999,
      attackPattern: 'MONO_DOUBLE',
    })
    const tank = makeUnit('B0', { hp: 100000, def: 50, spd: 1 })
    const result = simulateBattle({
      teamA: [attacker],
      teamB: [tank],
      seed: 'double-test',
      timeoutTurns: 2,
    })
    // The first round, A0 acts first and strikes twice before B0 attacks.
    const a0Attacks = result.log.filter(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    expect(a0Attacks.length).toBeGreaterThanOrEqual(2)
    // The first two log ATTACK entries should both be from A0
    const attackEntries = result.log.filter((e) => e.type === 'ATTACK')
    expect(attackEntries[0]?.type).toBe('ATTACK')
    expect(attackEntries[1]?.type).toBe('ATTACK')
    if (
      attackEntries[0]?.type === 'ATTACK' &&
      attackEntries[1]?.type === 'ATTACK'
    ) {
      expect(attackEntries[0].attackerId).toBe('A0')
      expect(attackEntries[1].attackerId).toBe('A0')
    }
  })

  // 8. AEGIS dodge rate
  it('AEGIS at palier 6 dodges roughly 17% of attacks over many trials', () => {
    let strikes = 0
    let dodges = 0
    for (let i = 0; i < 200; i++) {
      const result = simulateBattle({
        teamA: [makeUnit('A0', { atk: 30, spd: 100 })],
        teamB: [
          makeUnit('B0', {
            hp: 1000000,
            def: 0,
            spd: 1,
            passiveKey: 'AEGIS',
            palier: 6,
          }),
        ],
        seed: `aegis-${i}`,
        timeoutTurns: 1,
      })
      for (const e of result.log) {
        if (e.type === 'ATTACK' && e.attackerId === 'A0') {
          for (const d of e.damages) {
            strikes += 1
            if (d.dodged) {
              dodges += 1
            }
          }
        }
      }
    }
    expect(strikes).toBeGreaterThan(0)
    const dodgeRate = dodges / strikes
    // Expected 17% with palier 6 — allow wide window 5–30%
    expect(dodgeRate).toBeGreaterThan(0.05)
    expect(dodgeRate).toBeLessThan(0.3)
  })

  // 9. VAMPIRISM heals the attacker
  it('VAMPIRISM heals the attacker and emits PASSIVE log entry', () => {
    const vamp = makeUnit('A0', {
      hp: 200,
      atk: 30,
      spd: 999,
      passiveKey: 'VAMPIRISM',
      palier: 6,
    })
    const enemy = makeUnit('B0', {
      hp: 5000,
      atk: 60,
      def: 0,
      spd: 50,
    })
    const result = simulateBattle({
      teamA: [vamp],
      teamB: [enemy],
      seed: 'vamp-heal',
      timeoutTurns: 5,
    })
    // We need attacker to have lost some HP first then healed, OR to receive
    // damage at some round. Either way, find at least one VAMPIRISM passive log.
    const vampLogs = result.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'VAMPIRISM',
    )
    expect(vampLogs.length).toBeGreaterThanOrEqual(1)
    if (vampLogs[0]?.type === 'PASSIVE') {
      expect(vampLogs[0].payload.healed).toBeGreaterThan(0)
    }
  })

  // 10. RIPOSTE reflects damage
  it('RIPOSTE reflects damage back to the attacker', () => {
    const attacker = makeUnit('A0', {
      hp: 500,
      atk: 100,
      def: 0,
      spd: 999,
    })
    const target = makeUnit('B0', {
      hp: 1000,
      atk: 1,
      def: 0,
      spd: 1,
      passiveKey: 'RIPOSTE',
      palier: 6,
    })
    const result = simulateBattle({
      teamA: [attacker],
      teamB: [target],
      seed: 'riposte-test',
      timeoutTurns: 1,
    })
    const riposteLogs = result.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'RIPOSTE',
    )
    expect(riposteLogs.length).toBeGreaterThanOrEqual(1)
    if (riposteLogs[0]?.type === 'PASSIVE') {
      expect(riposteLogs[0].payload.reflected).toBeGreaterThan(0)
    }
  })

  // 11. REBIRTH revives once, dies on second
  it('REBIRTH revives a unit once then it dies on the next kill', () => {
    const killer = makeUnit('A0', {
      hp: 5000,
      atk: 500,
      def: 0,
      spd: 999,
    })
    const reborn = makeUnit('B0', {
      hp: 100,
      atk: 1,
      def: 0,
      spd: 1,
      passiveKey: 'REBIRTH',
      palier: 6,
    })
    const result = simulateBattle({
      teamA: [killer],
      teamB: [reborn],
      seed: 'rebirth-test',
      timeoutTurns: 5,
    })
    const rebirthLogs = result.log.filter((e) => e.type === 'REBIRTH')
    expect(rebirthLogs.length).toBe(1)
    if (rebirthLogs[0]?.type === 'REBIRTH') {
      expect(rebirthLogs[0].unitId).toBe('B0')
      expect(rebirthLogs[0].restoredHp).toBeGreaterThan(0)
    }
    const deathLogs = result.log.filter(
      (e) => e.type === 'DEATH' && e.unitId === 'B0',
    )
    expect(deathLogs.length).toBe(1)
    expect(result.won).toBe('A')
  })

  // 12. EXECUTION boosts damage on low-HP target
  it('EXECUTION boosts damage when target is under 30% HP', () => {
    const seed = 'execution-test'
    // Baseline: BASIC attacker on a low-HP target — no passive
    const baseline = simulateBattle({
      teamA: [makeUnit('A0', { atk: 30, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 100, def: 0 })], // currentHp = 100 < 30% of 100? no — 100 is 100% of 100
      seed,
      timeoutTurns: 1,
    })
    // For EXECUTION to trigger we need currentHp < 30% maxHp.
    // Trick: set maxHp = 1000 and immediately start currentHp at "low" — but the
    // sim sets currentHp = hp at start. So we use a maxHp=1000 unit and a tiny
    // hp=200 in a separate config. Simpler approach: use a multi-round battle
    // and compare total damage between EXECUTION and non-EXECUTION attackers.
    void baseline

    const noExec = simulateBattle({
      teamA: [makeUnit('A0', { hp: 100000, atk: 30, def: 1000, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 1000, atk: 1, def: 0, spd: 1 })],
      seed,
      timeoutTurns: 100,
    })
    const withExec = simulateBattle({
      teamA: [
        makeUnit('A0', {
          hp: 100000,
          atk: 30,
          def: 1000,
          spd: 999,
          passiveKey: 'EXECUTION',
          palier: 6,
        }),
      ],
      teamB: [makeUnit('B0', { hp: 1000, atk: 1, def: 0, spd: 1 })],
      seed,
      timeoutTurns: 100,
    })
    expect(withExec.turns).toBeLessThanOrEqual(noExec.turns)
    // At least one EXECUTION PASSIVE log should appear
    const execLogs = withExec.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'EXECUTION',
    )
    expect(execLogs.length).toBeGreaterThan(0)
  })

  // 13. BANNER boosts whole team ATK
  it('BANNER emits BANNER_APPLIED entry and boosts team A damage', () => {
    const seed = 'banner-test'
    const noBanner = simulateBattle({
      teamA: [
        makeUnit('A0', { atk: 30, spd: 999 }),
        makeUnit('A1', { atk: 30, spd: 998 }),
      ],
      teamB: [makeUnit('B0', { hp: 5000, def: 0, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const withBanner = simulateBattle({
      teamA: [
        makeUnit('A0', {
          atk: 30,
          spd: 999,
          passiveKey: 'BANNER',
          palier: 6,
        }),
        makeUnit('A1', { atk: 30, spd: 998 }),
      ],
      teamB: [makeUnit('B0', { hp: 5000, def: 0, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const bannerLog = withBanner.log.find(
      (e) => e.type === 'BANNER_APPLIED' && e.side === 'A',
    )
    expect(bannerLog).toBeDefined()
    if (bannerLog?.type === 'BANNER_APPLIED') {
      expect(bannerLog.bonusPct).toBeGreaterThan(0)
    }
    const noBannerFirst = noBanner.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    const bannerFirst = withBanner.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    if (
      noBannerFirst?.type === 'ATTACK' &&
      bannerFirst?.type === 'ATTACK'
    ) {
      const bannerDmg = bannerFirst.damages[0]?.final ?? 0
      const noBannerDmg = noBannerFirst.damages[0]?.final ?? 0
      expect(bannerDmg).toBeGreaterThan(noBannerDmg)
    }
  })

  // 14. TIMEOUT
  it('TIMEOUT returns won: null after the configured turn limit', () => {
    const tank = (id: string): SimulatorUnit =>
      makeUnit(id, { hp: 500, atk: 1, def: 1000, spd: 100 })
    const result = simulateBattle({
      teamA: [tank('A0'), tank('A1')],
      teamB: [tank('B0'), tank('B1')],
      seed: 'timeout',
      timeoutTurns: 5,
    })
    expect(result.won).toBeNull()
    const last = result.log[result.log.length - 1]
    expect(last?.type).toBe('TIMEOUT')
  })

  // 14b. Default timeout is 60 timeoutTurns (= 60 * ACTION_THRESHOLD / BASE_SPD_REF time units).
  // Under ATB semantics, turns = total number of actions fired before the cap, not round count.
  // 4 tanks (spd=100) each act ~60 times in the cap → turns ≈ 240, not 60.
  it('defaults to a 60-turn limit when timeoutTurns is omitted', () => {
    const tank = (id: string): SimulatorUnit =>
      makeUnit(id, { hp: 500, atk: 1, def: 1000, spd: 100 })
    const result = simulateBattle({
      teamA: [tank('A0'), tank('A1')],
      teamB: [tank('B0'), tank('B1')],
      seed: 'default-timeout',
    })
    expect(result.won).toBeNull()
    // ATB: turns = action count, not round count. 4 units × ~60 actions each ≈ 240.
    expect(result.turns).toBeGreaterThan(60)
    expect(result.log[result.log.length - 1]?.type).toBe('TIMEOUT')
  })

  // 15. 1v3 boss config
  it('1v3 boss with AOE_3 eventually defeats 3 weak units', () => {
    const boss = makeUnit('A0', {
      hp: 10000,
      atk: 80,
      def: 50,
      spd: 100,
      attackPattern: 'AOE_3',
    })
    const result = simulateBattle({
      teamA: [boss],
      teamB: [
        makeUnit('B0', { hp: 300, atk: 30 }),
        makeUnit('B1', { hp: 300, atk: 30 }),
        makeUnit('B2', { hp: 300, atk: 30 }),
      ],
      seed: 'boss-1v3',
    })
    expect(result.won).toBe('A')
    // Every B0/B1/B2 should have a DEATH entry
    const deaths = result.log.filter(
      (e) => e.type === 'DEATH' && e.unitId.startsWith('B'),
    )
    expect(deaths.length).toBe(3)
    // AOE attacks should have 3 targets at first (one per surviving enemy after)
    const firstAoe = result.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    if (firstAoe?.type === 'ATTACK') {
      expect(firstAoe.targetIds.length).toBe(3)
    }
  })

  // Edge case: empty teams
  it('returns null/empty for two empty teams', () => {
    const result = simulateBattle({
      teamA: [],
      teamB: [],
      seed: 'empty',
    })
    expect(result.won).toBeNull()
    expect(result.log).toEqual([])
    expect(result.turns).toBe(0)
  })

  it('returns immediate WIN if one team is empty', () => {
    const result = simulateBattle({
      teamA: [makeUnit('A0')],
      teamB: [],
      seed: 'one-empty',
    })
    expect(result.won).toBe('A')
  })

  // -----------------------------------------------------------------------
  // New passives
  // -----------------------------------------------------------------------

  function firstAttackDamage(log: LogEntry[], attackerId: string): number {
    const atk = log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === attackerId,
    )
    if (atk?.type === 'ATTACK') {
      return atk.damages[0]?.final ?? 0
    }
    return 0
  }

  // VIGOR — +% max HP → survives more hits
  it('VIGOR raises effective HP so the unit takes more hits to die', () => {
    const seed = 'vigor-test'
    const attacker = () => makeUnit('A0', { atk: 50, def: 0, spd: 999 })
    const base = simulateBattle({
      teamA: [attacker()],
      teamB: [makeUnit('B0', { hp: 500, atk: 1, def: 0, spd: 1 })],
      seed,
      timeoutTurns: 100,
    })
    const vig = simulateBattle({
      teamA: [attacker()],
      teamB: [
        makeUnit('B0', {
          hp: 500,
          atk: 1,
          def: 0,
          spd: 1,
          passiveKey: 'VIGOR',
          palier: 6,
        }),
      ],
      seed,
      timeoutTurns: 100,
    })
    expect(vig.turns).toBeGreaterThan(base.turns)
  })

  // HASTE — +% SPD → acts before a slightly faster enemy
  it('HASTE lets a unit act before an enemy with marginally higher SPD', () => {
    const withHaste = simulateBattle({
      teamA: [makeUnit('A0', { spd: 100, passiveKey: 'HASTE', palier: 6 })],
      teamB: [makeUnit('B0', { spd: 110 }), makeUnit('B1', { spd: 40 })],
      seed: 'haste-test',
      timeoutTurns: 1,
    })
    const first = withHaste.log.find((e) => e.type === 'ATTACK')
    expect(first?.type).toBe('ATTACK')
    if (first?.type === 'ATTACK') {
      expect(first.attackerId).toBe('A0')
    }
  })

  // FORTIFY — +% DEF → takes less damage
  it('FORTIFY reduces incoming damage', () => {
    const seed = 'fortify-test'
    const base = simulateBattle({
      teamA: [makeUnit('A0', { atk: 80, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 100000, def: 20, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const fort = simulateBattle({
      teamA: [makeUnit('A0', { atk: 80, spd: 999 })],
      teamB: [
        makeUnit('B0', {
          hp: 100000,
          def: 20,
          spd: 1,
          passiveKey: 'FORTIFY',
          palier: 6,
        }),
      ],
      seed,
      timeoutTurns: 1,
    })
    expect(firstAttackDamage(fort.log, 'A0')).toBeLessThan(
      firstAttackDamage(base.log, 'A0'),
    )
  })

  // EMPOWER — +% ATK → deals more damage
  it('EMPOWER increases the attacker damage', () => {
    const seed = 'empower-test'
    const base = simulateBattle({
      teamA: [makeUnit('A0', { atk: 50, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 100000, def: 10, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const emp = simulateBattle({
      teamA: [
        makeUnit('A0', { atk: 50, spd: 999, passiveKey: 'EMPOWER', palier: 6 }),
      ],
      teamB: [makeUnit('B0', { hp: 100000, def: 10, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    expect(firstAttackDamage(emp.log, 'A0')).toBeGreaterThan(
      firstAttackDamage(base.log, 'A0'),
    )
  })

  // BULWARK — shield absorbs damage before HP
  it('BULWARK absorbs early damage with a shield and emits a PASSIVE log', () => {
    const withBulwark = simulateBattle({
      teamA: [makeUnit('A0', { atk: 40, def: 0, spd: 999 })],
      teamB: [
        makeUnit('B0', {
          hp: 200,
          atk: 1,
          def: 0,
          spd: 1,
          passiveKey: 'BULWARK',
          palier: 6,
        }),
      ],
      seed: 'bulwark-test',
      timeoutTurns: 1,
    })
    const bulwarkLogs = withBulwark.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'BULWARK',
    )
    expect(bulwarkLogs.length).toBeGreaterThanOrEqual(1)
    if (bulwarkLogs[0]?.type === 'PASSIVE') {
      expect(bulwarkLogs[0].payload.absorbed).toBeGreaterThan(0)
    }
  })

  // FURY — bonus damage when the attacker is under 50% HP
  // ATB: B0 (spd=110) acts before A0 (spd=100), damaging A0 below 50% HP;
  // then A0 gets its turn and FURY triggers.
  it('FURY triggers when the attacker drops below 50% HP', () => {
    const result = simulateBattle({
      teamA: [
        makeUnit('A0', {
          hp: 1000,
          atk: 30,
          def: 0,
          spd: 100,
          passiveKey: 'FURY',
          palier: 6,
        }),
      ],
      teamB: [makeUnit('B0', { hp: 100000, atk: 600, def: 0, spd: 110 })],
      seed: 'fury-test',
      timeoutTurns: 3,
    })
    const furyLogs = result.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'FURY',
    )
    expect(furyLogs.length).toBeGreaterThanOrEqual(1)
  })

  // CRIT — chance to deal double damage over many trials
  // ATB: count crits per attack (not per battle), since a fast attacker fires multiple
  // attacks within a single timeoutTurns window.
  it('CRIT produces double-damage procs over many trials', () => {
    let crits = 0
    let attacks = 0
    for (let i = 0; i < 200; i++) {
      const result = simulateBattle({
        teamA: [
          makeUnit('A0', {
            atk: 30,
            spd: 999,
            passiveKey: 'CRIT',
            palier: 6,
          }),
        ],
        teamB: [makeUnit('B0', { hp: 100000, def: 0, spd: 1 })],
        seed: `crit-${i}`,
        timeoutTurns: 1,
      })
      crits += result.log.filter(
        (e) => e.type === 'PASSIVE' && e.passive === 'CRIT',
      ).length
      attacks += result.log.filter(
        (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
      ).length
    }
    // Palier 6 → 26 % crit rate per attack; allow a wide window.
    const rate = crits / Math.max(1, attacks)
    expect(rate).toBeGreaterThan(0.1)
    expect(rate).toBeLessThan(0.45)
  })

  // PIERCE — ignores part of the target DEF → more damage
  it('PIERCE increases damage against a high-DEF target', () => {
    const seed = 'pierce-test'
    const base = simulateBattle({
      teamA: [makeUnit('A0', { atk: 50, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 100000, def: 100, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const pierce = simulateBattle({
      teamA: [
        makeUnit('A0', { atk: 50, spd: 999, passiveKey: 'PIERCE', palier: 6 }),
      ],
      teamB: [makeUnit('B0', { hp: 100000, def: 100, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    expect(firstAttackDamage(pierce.log, 'A0')).toBeGreaterThan(
      firstAttackDamage(base.log, 'A0'),
    )
  })

  // NEMESIS — gains ATK for each fallen ally
  // ATB: A0 (spd=100) and A1 (spd=100) act at ATB cadence. B0 (spd=999) kills A1
  // almost immediately; A0 then acts with NEMESIS bonus.
  it('NEMESIS emits a PASSIVE log once an ally has fallen', () => {
    const result = simulateBattle({
      teamA: [
        makeUnit('A0', {
          hp: 100000,
          atk: 30,
          def: 1000,
          spd: 100,
          passiveKey: 'NEMESIS',
          palier: 6,
        }),
        makeUnit('A1', { hp: 1, atk: 1, def: 0, spd: 100 }),
      ],
      teamB: [makeUnit('B0', { hp: 100000, atk: 500, def: 0, spd: 999 })],
      seed: 'nemesis-test',
      timeoutTurns: 3,
    })
    const nemesisLogs = result.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'NEMESIS',
    )
    expect(nemesisLogs.length).toBeGreaterThanOrEqual(1)
    if (nemesisLogs[0]?.type === 'PASSIVE') {
      expect(nemesisLogs[0].payload.fallenAllies).toBeGreaterThanOrEqual(1)
    }
  })

  // RAMPART — flat mitigation of incoming damage
  it('RAMPART reduces incoming damage and emits a PASSIVE log', () => {
    const seed = 'rampart-test'
    const base = simulateBattle({
      teamA: [makeUnit('A0', { atk: 80, spd: 999 })],
      teamB: [makeUnit('B0', { hp: 100000, def: 10, spd: 1 })],
      seed,
      timeoutTurns: 1,
    })
    const rampart = simulateBattle({
      teamA: [makeUnit('A0', { atk: 80, spd: 999 })],
      teamB: [
        makeUnit('B0', {
          hp: 100000,
          def: 10,
          spd: 1,
          passiveKey: 'RAMPART',
          palier: 6,
        }),
      ],
      seed,
      timeoutTurns: 1,
    })
    expect(firstAttackDamage(rampart.log, 'A0')).toBeLessThan(
      firstAttackDamage(base.log, 'A0'),
    )
    const rampartLogs = rampart.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'RAMPART',
    )
    expect(rampartLogs.length).toBeGreaterThanOrEqual(1)
  })

  // REGEN — heals a fraction of max HP at end of turn
  it('REGEN heals the unit at the end of a turn', () => {
    const result = simulateBattle({
      teamA: [
        makeUnit('A0', {
          hp: 1000,
          atk: 1,
          def: 50,
          spd: 100,
          passiveKey: 'REGEN',
          palier: 6,
        }),
      ],
      teamB: [makeUnit('B0', { hp: 1000, atk: 30, def: 50, spd: 100 })],
      seed: 'regen-test',
      timeoutTurns: 10,
    })
    const regenLogs = result.log.filter(
      (e) => e.type === 'PASSIVE' && e.passive === 'REGEN',
    )
    expect(regenLogs.length).toBeGreaterThanOrEqual(1)
    if (regenLogs[0]?.type === 'PASSIVE') {
      expect(regenLogs[0].payload.healed).toBeGreaterThan(0)
    }
  })

  // Sanity: every attack pattern produces an ATTACK with damages
  it.each<AttackPattern>([
    'BASIC',
    'AOE_3',
    'MULTI_2',
    'MONO_AMPLIFIED',
    'MONO_DOUBLE',
  ])('attack pattern %s produces a valid ATTACK entry', (pattern) => {
    const result = simulateBattle({
      teamA: [
        makeUnit('A0', { atk: 50, spd: 999, attackPattern: pattern }),
      ],
      teamB: [
        makeUnit('B0', { hp: 100000, def: 10, spd: 1 }),
        makeUnit('B1', { hp: 100000, def: 10, spd: 1 }),
        makeUnit('B2', { hp: 100000, def: 10, spd: 1 }),
      ],
      seed: `pattern-${pattern}`,
      timeoutTurns: 1,
    })
    const a0Attack = result.log.find(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    )
    expect(a0Attack).toBeDefined()
    if (a0Attack?.type === 'ATTACK') {
      expect(a0Attack.damages.length).toBe(a0Attack.targetIds.length)
      for (const d of a0Attack.damages) {
        expect(d.final).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // ------------------------------------------------------------------------
  // Nouveaux passifs de famille
  // ------------------------------------------------------------------------
  describe('passifs de famille', () => {
    function passiveEntries(
      log: LogEntry[],
      passive: string,
    ): Extract<LogEntry, { type: 'PASSIVE' }>[] {
      return log.filter(
        (e): e is Extract<LogEntry, { type: 'PASSIVE' }> =>
          e.type === 'PASSIVE' && e.passive === passive,
      )
    }

    it('POISON applique un effet qui inflige des dégâts en fin de tour', () => {
      // ATB: B0 (spd=100) must get a turn for the DoT to tick (applied at actor own turn).
      const result = simulateBattle({
        teamA: [
          makeUnit('A0', { atk: 1, spd: 999, passiveKey: 'POISON' }),
        ],
        teamB: [makeUnit('B0', { hp: 100000, def: 0, spd: 100 })],
        seed: 'poison-test',
        timeoutTurns: 2,
      })
      const entries = passiveEntries(result.log, 'POISON')
      // Au moins une application (dmgPerTurn) et un tick (damage).
      expect(entries.some((e) => 'dmgPerTurn' in e.payload)).toBe(true)
      expect(entries.some((e) => 'damage' in e.payload)).toBe(true)
    })

    it('BURN applique une brûlure basée sur l’ATQ', () => {
      const result = simulateBattle({
        teamA: [
          makeUnit('A0', { atk: 100, spd: 999, passiveKey: 'BURN' }),
        ],
        // ATB: B0 (spd=100) must get a turn for the DoT to tick (applied at actor own turn).
        teamB: [makeUnit('B0', { hp: 100000, def: 0, spd: 100 })],
        seed: 'burn-test',
        timeoutTurns: 2,
      })
      const entries = passiveEntries(result.log, 'BURN')
      expect(entries.length).toBeGreaterThan(0)
      const tick = entries.find((e) => 'damage' in e.payload)
      expect(tick).toBeDefined()
      if (tick) {
        expect(tick.payload.damage).toBeGreaterThan(0)
      }
    })

    it('BLESSING soigne un allié blessé en fin de tour', () => {
      // ATB: A0 (spd=100, BLESSING) must get a turn after B0 damages A1.
      const result = simulateBattle({
        teamA: [
          makeUnit('A0', {
            hp: 2000,
            atk: 1,
            spd: 100,
            passiveKey: 'BLESSING',
          }),
          makeUnit('A1', { hp: 1000, atk: 1, def: 0, spd: 100 }),
        ],
        teamB: [makeUnit('B0', { hp: 100000, atk: 200, def: 0, spd: 500 })],
        seed: 'blessing-test',
        timeoutTurns: 2,
      })
      const entries = passiveEntries(result.log, 'BLESSING')
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]?.payload.healed).toBeGreaterThan(0)
    })

    it('SANCTUARY soigne toute l’équipe en fin de tour', () => {
      const result = simulateBattle({
        // ATB: A0 (spd=100, SANCTUARY) must get a turn after B0 damages A1.
        teamA: [
          makeUnit('A0', {
            hp: 2000,
            atk: 1,
            spd: 100,
            passiveKey: 'SANCTUARY',
          }),
          makeUnit('A1', { hp: 1000, atk: 1, def: 0, spd: 100 }),
        ],
        teamB: [makeUnit('B0', { hp: 100000, atk: 200, def: 0, spd: 500 })],
        seed: 'sanctuary-test',
        timeoutTurns: 2,
      })
      const entries = passiveEntries(result.log, 'SANCTUARY')
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]?.payload.healed).toBeGreaterThan(0)
    })

    it('BLOODLUST soigne l’attaquant blessé qui élimine un ennemi', () => {
      const result = simulateBattle({
        teamA: [
          makeUnit('A0', {
            hp: 1000,
            atk: 1000,
            def: 0,
            spd: 999,
            passiveKey: 'BLOODLUST',
          }),
        ],
        teamB: [
          makeUnit('B0', { hp: 100000, atk: 300, def: 0, spd: 1000 }),
          makeUnit('B1', { hp: 1, atk: 1, def: 0, spd: 1 }),
        ],
        seed: 'bloodlust-test',
        timeoutTurns: 1,
      })
      const entries = passiveEntries(result.log, 'BLOODLUST')
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]?.payload.kills).toBe(1)
      expect(entries[0]?.payload.healed).toBeGreaterThan(0)
    })
  })
})

describe('ATB battle behavior', () => {
  it('a much faster attacker lands more ATTACK actions than a slower one', () => {
    const fast = makeUnit('A0', { spd: 300, hp: 100000, atk: 1 })
    const slow = makeUnit('B0', { spd: 100, hp: 100000, atk: 1 })
    // hp énorme + atk faible => pas de mort avant le cap => on compte les actions.
    const result = simulateBattle({
      teamA: [fast],
      teamB: [slow],
      seed: 'atb-freq',
      timeoutTurns: 60,
    })
    const aAttacks = result.log.filter(
      (e) => e.type === 'ATTACK' && e.attackerId === 'A0',
    ).length
    const bAttacks = result.log.filter(
      (e) => e.type === 'ATTACK' && e.attackerId === 'B0',
    ).length
    expect(aAttacks).toBeGreaterThan(bAttacks)
    // ~3:1 attendu (300 vs 100), tolérance large.
    expect(aAttacks / Math.max(1, bAttacks)).toBeGreaterThan(2.3)
  })

  it('turns counts total actions, not rounds', () => {
    const result = simulateBattle({ ...mirrorTeams(), seed: 'atb-turns' })
    const attackCount = result.log.filter((e) => e.type === 'ATTACK').length
    // Chaque action produit exactement un ATTACK (patterns simples) ; turns >= attackCount.
    expect(result.turns).toBeGreaterThanOrEqual(1)
    expect(result.turns).toBeGreaterThanOrEqual(attackCount)
  })

  it('unkillable units end in a TIMEOUT draw at the cap', () => {
    const a = makeUnit('A0', { hp: 1000000, atk: 0, def: 1000 })
    const b = makeUnit('B0', { hp: 1000000, atk: 0, def: 1000 })
    const result = simulateBattle({
      teamA: [a],
      teamB: [b],
      seed: 'atb-timeout',
      timeoutTurns: 10,
    })
    expect(result.won).toBeNull()
    expect(result.log[result.log.length - 1]?.type).toBe('TIMEOUT')
  })
})

describe('ATB scheduler', () => {
  it('a unit with 2x speed acts about twice as often', () => {
    const { advanceToNextActor, ACTION_THRESHOLD } = _internals
    // Unités minimales pour l'ordonnanceur (structure BattleUnit interne).
    const fast = { id: 'F', side: 'A', spd: 200, gauge: 0, alive: true } as never
    const slow = { id: 'S', side: 'B', spd: 100, gauge: 0, alive: true } as never
    const units = [fast, slow] as never[]
    const prng = _internals.mulberry32(_internals.hashSeed('freq'))
    const counts: Record<string, number> = { F: 0, S: 0 }
    for (let i = 0; i < 300; i++) {
      const next = advanceToNextActor(units, prng)
      if (next) {
        counts[(next.actor as { id: string }).id] += 1
      }
    }
    // ~2:1 attendu, tolérance large.
    const ratio = counts.F / Math.max(1, counts.S)
    expect(ratio).toBeGreaterThan(1.7)
    expect(ratio).toBeLessThan(2.3)
    expect(ACTION_THRESHOLD).toBe(1000)
  })
})
