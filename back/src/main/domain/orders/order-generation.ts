import type { CardRarity } from '../../../generated/client'
import type {
  DuplicateStack,
  MatchableCard,
  OrderLine,
  PoolCard,
  Rng,
} from '../../types/domain/orders/orders.domain.interface'
import { weightedPick } from '../shared/weighted-pick'
import { RARITY_ORDER } from '../wagers/wager-rules'
import { cardMatchesLine } from './order-matching'

const MAX_LINES = 2
const MAX_QUANTITY = 3
const SECOND_LINE_CHANCE = 0.5

const pickIndex = (length: number, rng: Rng) => Math.floor(rng() * length)

/** Filtre de la ligne, tiré à partir de la carte « graine » : aucun, son
 *  élément ou son set — un seul à la fois. */
function lineFromSeed(
  seed: MatchableCard,
  rng: Rng,
): Omit<OrderLine, 'quantity'> {
  const options: Omit<OrderLine, 'quantity'>[] = [
    { rarity: seed.rarity },
    { rarity: seed.rarity, setId: seed.setId },
  ]
  if (seed.element) {
    options.push({ rarity: seed.rarity, element: seed.element })
  }
  const picked = options[pickIndex(options.length, rng)]
  if (!picked) {
    throw new Error('options ne peut pas être vide')
  }
  return picked
}

const sameCriteria = (
  a: Omit<OrderLine, 'quantity'>,
  b: Omit<OrderLine, 'quantity'>,
) => a.rarity === b.rarity && a.element === b.element && a.setId === b.setId

/** Commande livrable avec les doublons fournis ; [] s'il n'y en a aucun. */
function feasibleLines(duplicates: DuplicateStack[], rng: Rng): OrderLine[] {
  const left = new Map(duplicates.map((d) => [d.userCardId, d.available]))
  const lines: OrderLine[] = []
  for (let i = 0; i < MAX_LINES; i++) {
    if (i > 0 && rng() >= SECOND_LINE_CHANCE) {
      break
    }
    const usable = duplicates.filter((d) => (left.get(d.userCardId) ?? 0) > 0)
    if (usable.length === 0) {
      break
    }
    // Graine pondérée par dropWeight, comme une commande libre.
    const criteria = lineFromSeed(weightedPick(usable, rng), rng)
    if (lines.some((l) => sameCriteria(l, criteria))) {
      break
    }
    const matching = usable.filter((d) =>
      cardMatchesLine(d, { ...criteria, quantity: 1 }),
    )
    const total = matching.reduce(
      (s, d) => s + (left.get(d.userCardId) ?? 0),
      0,
    )
    const quantity = 1 + pickIndex(Math.min(MAX_QUANTITY, total), rng)
    // Réserve les cartes de cette ligne pour que la suivante reste livrable.
    let need = quantity
    for (const d of matching) {
      const take = Math.min(need, left.get(d.userCardId) ?? 0)
      left.set(d.userCardId, (left.get(d.userCardId) ?? 0) - take)
      need -= take
    }
    lines.push({ ...criteria, quantity })
  }
  return lines
}

function freeLines(
  pool: PoolCard[],
  maxOwnedRarity: CardRarity,
  rng: Rng,
): OrderLine[] {
  const cap = RARITY_ORDER.indexOf(maxOwnedRarity)
  const eligible = pool.filter((c) => RARITY_ORDER.indexOf(c.rarity) <= cap)
  if (eligible.length === 0) {
    return []
  }
  const lines: OrderLine[] = []
  for (let i = 0; i < MAX_LINES; i++) {
    if (i > 0 && rng() >= SECOND_LINE_CHANCE) {
      break
    }
    const criteria = lineFromSeed(weightedPick(eligible, rng), rng)
    if (lines.some((l) => sameCriteria(l, criteria))) {
      break
    }
    lines.push({ ...criteria, quantity: 1 + pickIndex(MAX_QUANTITY, rng) })
  }
  return lines
}

/**
 * Lignes d'une nouvelle commande. `feasible` : bâtie sur les doublons du
 * joueur (livrable tout de suite) ; repli sur une commande libre s'il n'en a
 * aucun. Libre : rareté pondérée par dropWeight, plafonnée à maxOwnedRarity.
 */
export function generateOrderLines(input: {
  duplicates: DuplicateStack[]
  pool: PoolCard[]
  maxOwnedRarity: CardRarity
  feasible: boolean
  rng: Rng
}): OrderLine[] {
  if (input.feasible) {
    const lines = feasibleLines(input.duplicates, input.rng)
    if (lines.length > 0) {
      return lines
    }
  }
  return freeLines(input.pool, input.maxOwnedRarity, input.rng)
}

export function pickClient(pool: PoolCard[], rng: Rng): string {
  const card = pool[pickIndex(pool.length, rng)]
  if (!card) {
    throw new Error('pool ne peut pas être vide')
  }
  return card.id
}
