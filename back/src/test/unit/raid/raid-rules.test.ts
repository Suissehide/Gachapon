import { describe, expect, it } from '@jest/globals'

import type { LogEntry } from '../../../main/domain/combat/battle-simulator.domain'
import { RAID_TIERS } from '../../../main/domain/content/raid.definitions'
import { DEFAULTS } from '../../../main/infra/config/config.service'
import {
  attacksRemaining,
  crossedTiers,
  damageDealtToBoss,
  nextRaidLevel,
  RAID_EPOCH_WEEK_KEY,
  raidElementForWeek,
  raidMaxHp,
  raidPct,
  raidTierRewardAtLevel,
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
  const base = { minMembers: 10, levelBonusPct: 10, level: 0 }

  it('facture au moins `minMembers`, même pour une équipe solo', () => {
    expect(raidMaxHp(20000, 1, base)).toBe(200000)
    expect(raidMaxHp(20000, 0, base)).toBe(200000)
  })

  it('au-delà du plancher, les PV suivent l’effectif réel', () => {
    expect(raidMaxHp(20000, 14, base)).toBe(280000)
  })

  it('chaque niveau compose le bonus de PV', () => {
    expect(raidMaxHp(20000, 10, { ...base, level: 1 })).toBe(220000)
    expect(raidMaxHp(20000, 10, { ...base, level: 3 })).toBe(266200)
  })

  it('arrondit à l’entier', () => {
    // 162000 × 10 × 1,1^5 = 2 609 026,2
    expect(raidMaxHp(162000, 10, { ...base, level: 5 })).toBe(2609026)
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

describe('raid-rules — niveau de difficulté', () => {
  const killed = new Date('2026-09-18T12:00:00.000Z')

  it('une équipe sans passé part au niveau 0', () => {
    expect(nextRaidLevel(null, '2026-09-21')).toBe(0)
  })

  it('une victoire la semaine dernière monte d’un cran', () => {
    expect(
      nextRaidLevel({ weekKey: '2026-09-14', level: 2, killedAt: killed }, '2026-09-21'),
    ).toBe(3)
  })

  it('une semaine jouée sans victoire fait redescendre d’un cran', () => {
    expect(
      nextRaidLevel({ weekKey: '2026-09-14', level: 2, killedAt: null }, '2026-09-21'),
    ).toBe(1)
  })

  it('ne descend jamais sous 0', () => {
    expect(
      nextRaidLevel({ weekKey: '2026-09-14', level: 0, killedAt: null }, '2026-09-21'),
    ).toBe(0)
  })

  it('chaque semaine entièrement sautée coûte un cran de plus', () => {
    // Victoire au niveau 3 la semaine du 31 août, puis deux semaines sans
    // aucun raid : +1 pour la victoire, −2 pour les semaines sautées.
    expect(
      nextRaidLevel({ weekKey: '2026-08-31', level: 3, killedAt: killed }, '2026-09-21'),
    ).toBe(2)
  })
})

describe('raid-rules — lots par niveau', () => {
  const base = { tokens: 13, gold: 1000, dust: 300 }

  it('le niveau 0 laisse le lot de base intact', () => {
    expect(raidTierRewardAtLevel(base, 0, 5)).toEqual(base)
  })

  it('le bonus est un pourcentage de la base du palier', () => {
    expect(raidTierRewardAtLevel(base, 2, 5)).toEqual({
      tokens: 14,
      gold: 1100,
      dust: 330,
    })
  })

  it('un petit palier monte proportionnellement, pas par bonds', () => {
    // Base 3 jetons : +5 % par cran ne fait franchir l'entier qu'au niveau 4.
    expect(raidTierRewardAtLevel({ tokens: 3, gold: 200, dust: 50 }, 1, 5).tokens).toBe(3)
    expect(raidTierRewardAtLevel({ tokens: 3, gold: 200, dust: 50 }, 4, 5).tokens).toBe(4)
  })
})

/**
 * L'INVARIANT ÉCONOMIQUE du raid, rendu exécutable — et lu depuis les
 * SOURCES RÉELLES (`DEFAULTS` et `RAID_TIERS`), jamais depuis des constantes
 * recopiées ici. Recopier serait exactement la faiblesse que ce test existe
 * pour combler, déplacée d'un étage : un changement de
 * `DEFAULTS['raid.levelRewardPct']`, `DEFAULTS['raid.levelHpBonusPct']` ou
 * `RAID_TIERS` continuerait d'éprouver d'anciens littéraux et ne
 * signalerait rien — précisément le scénario qui a produit cette tâche.
 * Même patron que `energy-pack-pricing.test.ts`.
 *
 * Les PV du boss croissent de `raid.levelHpBonusPct` % composés par niveau,
 * les lots de `raid.levelRewardPct` % de leur base — donc la récompense par
 * point de dégât doit décroître STRICTEMENT à chaque cran. Sans quoi monter
 * en difficulté deviendrait un farm plus rentable, exactement le contraire
 * du but de la mécanique.
 *
 * Ce test a été écrit après coup : le barème additif précédent (+2 jetons par
 * niveau sur une base de 5) violait l'invariant du niveau 1 au niveau 8, et
 * rien ne l'a signalé.
 */
describe('raid-rules — invariant : la récompense par point de dégât décroît', () => {
  const HP_BONUS_PCT = DEFAULTS['raid.levelHpBonusPct']
  const REWARD_BONUS_PCT = DEFAULTS['raid.levelRewardPct']
  const BASE_HP_PER_MEMBER = DEFAULTS['raid.baseHpPerMember']
  const MIN_MEMBERS = DEFAULTS['raid.minMembers']

  it.each(['tokens', 'gold', 'dust'] as const)(
    'la ressource %s rapporte strictement moins par PV à chaque niveau',
    (field) => {
      const ratios = Array.from({ length: 11 }, (_, level) => {
        const total = RAID_TIERS.reduce(
          (sum, tier) =>
            sum + raidTierRewardAtLevel(tier, level, REWARD_BONUS_PCT)[field],
          0,
        )
        const hp = raidMaxHp(BASE_HP_PER_MEMBER, MIN_MEMBERS, {
          minMembers: MIN_MEMBERS,
          levelBonusPct: HP_BONUS_PCT,
          level,
        })
        return total / hp
      })

      for (let level = 1; level < ratios.length; level++) {
        expect(ratios[level]).toBeLessThan(ratios[level - 1] as number)
      }
    },
  )
})
