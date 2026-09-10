import { describe, expect, it } from '@jest/globals'

import type { LogEntry } from '../../../main/domain/combat/battle-simulator.domain'
import {
  attacksRemaining,
  crossedTiers,
  damageDealtToBoss,
  RAID_EPOCH_WEEK_KEY,
  raidElementForWeek,
  raidMaxHp,
  raidPct,
  raidWeekEndsAt,
  raidWeekIndex,
  raidWeekKey,
  utcDayStart,
} from '../../../main/domain/raid/raid-rules'

describe('raid-rules — semaine', () => {
  it('raidWeekKey : dimanche 23:59:59 UTC appartient encore à la semaine du lundi précédent', () => {
    expect(raidWeekKey(new Date('2026-09-13T23:59:59.999Z'))).toBe('2026-09-07')
  })

  it('raidWeekKey : lundi 00:00 UTC ouvre une nouvelle semaine', () => {
    expect(raidWeekKey(new Date('2026-09-14T00:00:00.000Z'))).toBe('2026-09-14')
  })

  it('raidWeekEndsAt : lundi suivant 00:00 UTC', () => {
    expect(raidWeekEndsAt('2026-09-07').toISOString()).toBe(
      '2026-09-14T00:00:00.000Z',
    )
  })

  it("l'époque est le lundi de la semaine du 1er janvier 2026", () => {
    expect(RAID_EPOCH_WEEK_KEY).toBe('2025-12-29')
    expect(raidWeekIndex('2025-12-29')).toBe(0)
    expect(raidWeekIndex('2026-01-05')).toBe(1)
  })
})

describe('raid-rules — rotation', () => {
  it('feu, eau, nature, terre à partir de la semaine du 1er janvier 2026', () => {
    const weeks = [
      '2025-12-29',
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
    ]
    expect(weeks.map(raidElementForWeek)).toEqual([
      'FIRE',
      'WATER',
      'NATURE',
      'EARTH',
      'FIRE',
      'WATER',
      'NATURE',
      'EARTH',
    ])
  })

  it("ne repart pas à zéro au changement d'année 2026/2027", () => {
    // 2026-12-28 est le lundi de la 52e semaine depuis l'époque (index 52 → FIRE),
    // 2027-01-04 suit sans rupture (index 53 → WATER).
    expect(raidWeekIndex('2026-12-28')).toBe(52)
    expect(raidElementForWeek('2026-12-28')).toBe('FIRE')
    expect(raidElementForWeek('2027-01-04')).toBe('WATER')
  })
})

describe('raid-rules — PV', () => {
  it('PV = base × membres, plancher à 1 membre', () => {
    expect(raidMaxHp(20000, 5)).toBe(100000)
    expect(raidMaxHp(20000, 1)).toBe(20000)
    expect(raidMaxHp(20000, 0)).toBe(20000)
  })
})

describe('raid-rules — dégâts', () => {
  const log: LogEntry[] = [
    {
      type: 'ATTACK',
      attackerId: 'A0',
      targetIds: ['B0'],
      damages: [{ id: 'B0', raw: 120, final: 100, dodged: false, crit: false }],
    },
    // Multi-cible : seule la part sur B0 compte.
    {
      type: 'ATTACK',
      attackerId: 'A1',
      targetIds: ['B0', 'B1'],
      damages: [
        { id: 'B0', raw: 60, final: 50, dodged: false, crit: true },
        { id: 'B1', raw: 60, final: 50, dodged: false, crit: false },
      ],
    },
    // Esquive : final 0.
    {
      type: 'ATTACK',
      attackerId: 'A2',
      targetIds: ['B0'],
      damages: [{ id: 'B0', raw: 80, final: 0, dodged: true, crit: false }],
    },
    // Attaque du boss sur le joueur : ignorée.
    {
      type: 'ATTACK',
      attackerId: 'B0',
      targetIds: ['A0'],
      damages: [{ id: 'A0', raw: 500, final: 400, dodged: false, crit: false }],
    },
    { type: 'TURN_END', turn: 1 },
    { type: 'TIMEOUT' },
  ]

  it('additionne les dégâts finaux des alliés sur B0 uniquement', () => {
    expect(damageDealtToBoss(log)).toBe(150)
  })

  it('journal vide → 0', () => {
    expect(damageDealtToBoss([])).toBe(0)
  })
})

describe('raid-rules — paliers', () => {
  const tiers = [{ pct: 25 }, { pct: 50 }, { pct: 75 }, { pct: 100 }]

  it('24,9 % ne franchit rien, 25 % franchit le premier', () => {
    expect(crossedTiers(249, 1000, tiers)).toEqual([])
    expect(crossedTiers(250, 1000, tiers)).toEqual([{ pct: 25 }])
  })

  it('100 % franchit tout', () => {
    expect(crossedTiers(1000, 1000, tiers)).toEqual(tiers)
  })

  it('les dégâts au-delà des PV max franchissent tout aussi', () => {
    expect(crossedTiers(5000, 1000, tiers)).toEqual(tiers)
  })
})

describe('raid-rules — quota', () => {
  it('utcDayStart tronque à minuit UTC', () => {
    expect(utcDayStart(new Date('2026-09-08T17:45:00Z')).toISOString()).toBe(
      '2026-09-08T00:00:00.000Z',
    )
  })

  it('attacksRemaining ne descend jamais sous 0', () => {
    expect(attacksRemaining(0, 2)).toBe(2)
    expect(attacksRemaining(2, 2)).toBe(0)
    expect(attacksRemaining(5, 2)).toBe(0)
  })
})

describe('raid-rules — pourcentage de barre', () => {
  it('plancher, jamais arrondi : un boss encore debout n\'affiche jamais 100 %', () => {
    expect(raidPct(9999, 10_000)).toBe(99)
    expect(raidPct(10_000, 10_000)).toBe(100)
  })

  it('borné des deux côtés, et 0 quand les PV maximum sont absurdes', () => {
    expect(raidPct(0, 10_000)).toBe(0)
    // L'overkill n'est jamais enregistré, mais la borne haute reste vraie.
    expect(raidPct(12_000, 10_000)).toBe(100)
    expect(raidPct(-5, 10_000)).toBe(0)
    expect(raidPct(50, 0)).toBe(0)
  })

  it('valeur exacte de la maquette : 8 600 dégâts sur 20 000 PV font 43 %', () => {
    expect(raidPct(8600, 20_000)).toBe(43)
  })
})
