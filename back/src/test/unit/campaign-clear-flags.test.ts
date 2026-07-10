import { deriveClearFlags } from '../../main/domain/campaign/campaign-clear-flags'
import type { LogEntry } from '../../main/domain/combat/battle-simulator.domain'

const allies = [{ id: 'A0' }, { id: 'A1' }, { id: 'A2' }]

describe('deriveClearFlags', () => {
  it('flawless quand aucun allié ne meurt (morts ennemies ignorées)', () => {
    const log: LogEntry[] = [
      { type: 'DEATH', unitId: 'B0' },
      { type: 'DEATH', unitId: 'B1' },
    ]
    expect(deriveClearFlags(log, allies, { chapter: 3, index: 5 })).toEqual({
      flawless: true,
      understaffed: false,
    })
  })

  it('non flawless si un allié meurt', () => {
    const log: LogEntry[] = [{ type: 'DEATH', unitId: 'A1' }]
    expect(deriveClearFlags(log, allies, { chapter: 3, index: 5 }).flawless).toBe(
      false,
    )
  })

  it('understaffed si < 3 alliés, hors 1-1/1-2', () => {
    const duo = [{ id: 'A0' }, { id: 'A1' }]
    expect(deriveClearFlags([], duo, { chapter: 1, index: 5 }).understaffed).toBe(
      true,
    )
    // exclu sur les stages triviaux 1-1 / 1-2
    expect(deriveClearFlags([], duo, { chapter: 1, index: 2 }).understaffed).toBe(
      false,
    )
  })
})
