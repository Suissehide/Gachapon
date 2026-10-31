import { describe, expect, it } from '@jest/globals'

import {
  capsulePoolOf,
  cometCapsuleCards,
} from '../../main/domain/gacha/card-pools'

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
const pool = RARITIES.flatMap((rarity) =>
  Array.from({ length: 10 }, (_, i) => ({
    id: `${rarity}-${i}`,
    rarity,
    element: i % 2 === 0 ? 'FIRE' : 'WATER',
  })),
)

describe('cometCapsuleCards', () => {
  it('3 cartes par rareté, 15 au total, sans doublon', () => {
    const cards = cometCapsuleCards(pool, '2026-10-26')
    expect(cards).toHaveLength(15)
    expect(new Set(cards.map((c) => c.id)).size).toBe(15)
    for (const rarity of RARITIES) {
      expect(cards.filter((c) => c.rarity === rarity)).toHaveLength(3)
    }
  })

  it('même sélection pour la même semaine quel que soit l’ordre du pool', () => {
    const a = cometCapsuleCards(pool, '2026-10-26').map((c) => c.id)
    const b = cometCapsuleCards([...pool].reverse(), '2026-10-26').map(
      (c) => c.id,
    )
    expect(b).toEqual(a)
  })

  it('change d’une semaine à l’autre', () => {
    const a = cometCapsuleCards(pool, '2026-10-26').map((c) => c.id)
    const b = cometCapsuleCards(pool, '2026-11-02').map((c) => c.id)
    expect(b).not.toEqual(a)
  })

  it('rareté à moins de 3 cartes : toutes ses cartes', () => {
    const small = pool.filter((c) => c.rarity !== 'LEGENDARY' || c.id === 'LEGENDARY-0')
    const cards = cometCapsuleCards(small, '2026-10-26')
    expect(cards.filter((c) => c.rarity === 'LEGENDARY').map((c) => c.id)).toEqual([
      'LEGENDARY-0',
    ])
  })
})

describe('capsulePoolOf', () => {
  it('capsule élémentaire : uniquement les cartes de l’élément', () => {
    const fire = capsulePoolOf('FIRE', pool, new Date())
    expect(fire).toHaveLength(25)
    expect(fire.every((c) => c.element === 'FIRE')).toBe(true)
  })

  it('jeton Constellation : sélection de la semaine UTC en cours', () => {
    const sunday = new Date('2026-11-01T23:00:00Z')
    expect(capsulePoolOf('COMET', pool, sunday)).toEqual(
      cometCapsuleCards(pool, '2026-10-26'),
    )
  })
})
