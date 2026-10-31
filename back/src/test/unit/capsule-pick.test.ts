import { describe, expect, it } from '@jest/globals'
import { pickCapsuleCard } from '../../main/domain/gacha/capsule-pick'
import type { CardWithSet } from '../../main/types/domain/gacha/gacha.types'

function makeCard(
  name: string,
  rarity: string,
  weight = 10,
  element: string | null = null,
): CardWithSet {
  return {
    id: name,
    name,
    nameFr: name,
    nameEn: name,
    rarity: rarity as any,
    element: element as any,
    dropWeight: weight,
    imageUrl: '',
    setId: 'set1',
    createdAt: new Date(),
    set: { id: 'set1', name: 'Test' },
  } as unknown as CardWithSet
}

const constRng = (v: number) => () => v
const base = { luckMultiplier: 1, forceLegendary: false }

describe('pickCapsuleCard', () => {
  const normal = [makeCard('nC', 'COMMON', 85), makeCard('nL', 'LEGENDARY', 1)]
  const astral = [
    makeCard('L', 'COMMON', 10, 'LIGHT'),
    makeCard('D', 'LEGENDARY', 10, 'DARK'),
  ]

  it('tire la rareté aux poids du pool normal', () => {
    expect(pickCapsuleCard(normal, astral, { ...base, rng: constRng(0) }).id).toBe('L')
    expect(pickCapsuleCard(normal, astral, { ...base, rng: constRng(0.999) }).id).toBe('D')
  })

  it('forceLegendary rend toujours la légendaire astrale', () => {
    for (const v of [0, 0.3, 0.7, 0.999]) {
      expect(
        pickCapsuleCard(normal, astral, { ...base, forceLegendary: true, rng: constRng(v) }).id,
      ).toBe('D')
    }
  })

  it('rareté sans carte astrale → descend jusqu’à en trouver une', () => {
    const n = [makeCard('nC', 'COMMON', 50), makeCard('nE', 'EPIC', 50)]
    const a = [makeCard('L', 'COMMON', 10, 'LIGHT'), makeCard('R', 'RARE', 10, 'DARK')]
    const card = pickCapsuleCard(n, a, { ...base, rng: constRng(0.99) })
    expect(card.id).toBe('R')
  })

  it('luckMultiplier 2 double le poids RARE+ (même règle que weightFor)', () => {
    const n = [makeCard('nC', 'COMMON', 50), makeCard('nR', 'RARE', 50)]
    const a = [makeCard('L', 'COMMON', 10, 'LIGHT'), makeCard('R', 'RARE', 10, 'DARK')]
    // roll 0.4 : sans chance 40/100 → COMMON ; avec chance 60/150 → RARE
    expect(pickCapsuleCard(n, a, { ...base, rng: constRng(0.4) }).id).toBe('L')
    expect(
      pickCapsuleCard(n, a, { ...base, luckMultiplier: 2, rng: constRng(0.4) }).id,
    ).toBe('R')
  })

  it("minRarity 'RARE' ne rend jamais de COMMON/UNCOMMON", () => {
    const n = [
      makeCard('nC', 'COMMON', 1000),
      makeCard('nU', 'UNCOMMON', 1000),
      makeCard('nR', 'RARE', 1),
    ]
    const a = [
      makeCard('L', 'COMMON', 10, 'LIGHT'),
      makeCard('U', 'UNCOMMON', 10, 'DARK'),
      makeCard('R', 'RARE', 10, 'LIGHT'),
    ]
    for (const v of [0, 0.5, 0.999]) {
      expect(
        pickCapsuleCard(n, a, { ...base, minRarity: 'RARE', rng: constRng(v) }).rarity,
      ).toBe('RARE')
    }
  })

  it('tire parmi les cartes astrales de la rareté au dropWeight', () => {
    const a = [
      makeCard('L1', 'COMMON', 1, 'LIGHT'),
      makeCard('L2', 'COMMON', 9, 'DARK'),
    ]
    const n = [makeCard('nC', 'COMMON', 1)]
    expect(pickCapsuleCard(n, a, { ...base, rng: constRng(0.05) }).id).toBe('L1')
    expect(pickCapsuleCard(n, a, { ...base, rng: constRng(0.5) }).id).toBe('L2')
  })

  it('lève si le pool astral est vide', () => {
    expect(() => pickCapsuleCard(normal, [], { ...base })).toThrow()
  })

  // Revue finale #4 : dropWeight 0 sur toutes les cartes de la rareté tirée
  // ne doit jamais être rendu — on descend à la rareté suivante.
  it('ignore une rareté dont toutes les cartes astrales ont dropWeight 0', () => {
    const n = [makeCard('nC', 'COMMON', 50), makeCard('nE', 'EPIC', 50)]
    const a = [
      makeCard('L0', 'COMMON', 0, 'LIGHT'),
      makeCard('D0', 'COMMON', 0, 'DARK'),
      makeCard('R', 'RARE', 10, 'DARK'),
    ]
    const card = pickCapsuleCard(n, a, { ...base, rng: constRng(0.001) })
    expect(card.id).toBe('R')
  })
})
