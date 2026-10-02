import { describe, expect, it } from '@jest/globals'

import {
  cardMatchesLine,
  suggestPicks,
  validateDelivery,
} from '../../main/domain/orders/order-matching'
import type {
  DuplicateStack,
  MatchableUserCard,
  OrderLine,
} from '../../main/types/domain/orders/orders.domain.interface'

const uc = (
  id: string,
  quantity: number,
  card: Partial<MatchableUserCard['card']> = {},
  variant: MatchableUserCard['variant'] = 'NORMAL',
): MatchableUserCard => ({
  id,
  quantity,
  variant,
  card: { rarity: 'RARE', element: 'WATER', setId: 's1', ...card },
})
const mapOf = (...cards: MatchableUserCard[]) =>
  new Map(cards.map((c) => [c.id, c]))
const stack = (
  userCardId: string,
  available: number,
  card: Partial<DuplicateStack> = {},
): DuplicateStack => ({
  userCardId,
  cardId: `c-${userCardId}`,
  available,
  rarity: 'RARE',
  element: 'WATER',
  setId: 's1',
  ...card,
})

describe('cardMatchesLine', () => {
  const card = { rarity: 'RARE', element: 'WATER', setId: 's1' } as const
  it('compare la rareté puis le filtre unique', () => {
    expect(cardMatchesLine(card, { quantity: 1, rarity: 'RARE' })).toBe(true)
    expect(cardMatchesLine(card, { quantity: 1, rarity: 'EPIC' })).toBe(false)
    expect(cardMatchesLine(card, { quantity: 1, rarity: 'RARE', element: 'FIRE' })).toBe(false)
    expect(cardMatchesLine(card, { quantity: 1, rarity: 'RARE', setId: 's2' })).toBe(false)
    expect(cardMatchesLine(card, { quantity: 1, rarity: 'RARE', setId: 's1' })).toBe(true)
  })
})

describe('validateDelivery', () => {
  const lines: OrderLine[] = [{ quantity: 2, rarity: 'RARE', element: 'WATER' }]

  it('accepte une couverture exacte', () => {
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'a', amount: 2 }], mapOf(uc('a', 3))),
    ).not.toThrow()
  })

  it('protège le dernier exemplaire', () => {
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'a', amount: 2 }], mapOf(uc('a', 2))),
    ).toThrow(/0/)
  })

  // Review Focus 1 : une même carte sur deux lignes — la somme compte.
  it('additionne les montants d\'une même carte sur plusieurs lignes', () => {
    const two: OrderLine[] = [
      { quantity: 1, rarity: 'RARE' },
      { quantity: 1, rarity: 'RARE', element: 'WATER' },
    ]
    expect(() =>
      validateDelivery(
        two,
        [
          { lineIndex: 0, userCardId: 'a', amount: 1 },
          { lineIndex: 1, userCardId: 'a', amount: 1 },
        ],
        mapOf(uc('a', 2)),
      ),
    ).toThrow()
    expect(() =>
      validateDelivery(
        two,
        [
          { lineIndex: 0, userCardId: 'a', amount: 1 },
          { lineIndex: 1, userCardId: 'a', amount: 1 },
        ],
        mapOf(uc('a', 3)),
      ),
    ).not.toThrow()
  })

  it('refuse les variantes brillantes et holographiques', () => {
    expect(() =>
      validateDelivery(
        lines,
        [{ lineIndex: 0, userCardId: 'a', amount: 2 }],
        mapOf(uc('a', 5, {}, 'BRILLIANT')),
      ),
    ).toThrow()
  })

  it('refuse une carte hors critères, une ligne inconnue, une carte inconnue', () => {
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'a', amount: 2 }], mapOf(uc('a', 5, { element: 'FIRE' }))),
    ).toThrow()
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 3, userCardId: 'a', amount: 2 }], mapOf(uc('a', 5))),
    ).toThrow()
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'zz', amount: 2 }], mapOf(uc('a', 5))),
    ).toThrow()
  })

  it('refuse une ligne sous-couverte ou sur-couverte', () => {
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'a', amount: 1 }], mapOf(uc('a', 5))),
    ).toThrow()
    expect(() =>
      validateDelivery(lines, [{ lineIndex: 0, userCardId: 'a', amount: 3 }], mapOf(uc('a', 5))),
    ).toThrow()
  })
})

describe('suggestPicks', () => {
  it('prend d\'abord la pile la plus fournie', () => {
    const picks = suggestPicks(
      [{ quantity: 2, rarity: 'RARE' }],
      [stack('a', 1), stack('b', 4)],
    )
    expect(picks).toEqual([{ lineIndex: 0, userCardId: 'b', amount: 2 }])
  })

  it('sert les lignes filtrées avant les lignes larges', () => {
    // Si la ligne large passait d'abord, elle mangerait la seule Eau.
    const picks = suggestPicks(
      [
        { quantity: 1, rarity: 'RARE' },
        { quantity: 1, rarity: 'RARE', element: 'WATER' },
      ],
      [stack('eau', 1), stack('feu', 1, { element: 'FIRE' })],
    )
    expect(picks).toEqual(
      expect.arrayContaining([
        { lineIndex: 1, userCardId: 'eau', amount: 1 },
        { lineIndex: 0, userCardId: 'feu', amount: 1 },
      ]),
    )
  })

  it('rend null quand la commande est impossible', () => {
    expect(suggestPicks([{ quantity: 3, rarity: 'RARE' }], [stack('a', 2)])).toBeNull()
  })

  it('produit une sélection que validateDelivery accepte', () => {
    const lines: OrderLine[] = [
      { quantity: 2, rarity: 'RARE' },
      { quantity: 1, rarity: 'RARE', element: 'WATER' },
    ]
    const stacks = [stack('a', 2), stack('b', 1, { element: 'FIRE' })]
    const picks = suggestPicks(lines, stacks)!
    expect(() =>
      validateDelivery(
        lines,
        picks,
        mapOf(uc('a', 3), uc('b', 2, { element: 'FIRE' })),
      ),
    ).not.toThrow()
  })
})
