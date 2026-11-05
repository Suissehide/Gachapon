import type { Card, CardVariant } from '../../api/collection.api.ts'
import { currentLocale } from '../../i18n/index.ts'
import type { UserCard } from '../../queries/useCollection.ts'
import {
  cardPower,
  emptyStatBonuses,
  type StatBonuses,
  type StatCurve,
} from '../../utils/cardStats.ts'
import type { SortMode } from './CollectionFilters.tsx'

/** Une tuile de la grille : une carte du catalogue, possédée ou non. */
export type DisplayEntry = {
  key: string
  card: Card
  /** Vernis affiché sur la tuile. */
  variant: CardVariant
  /** Vernis débloqués en plus du NORMAL (vide si non possédée). */
  finishes: CardVariant[]
  quantity: number
  isOwned: boolean
  userCard: UserCard | null
}

/** Ordre d'affichage des vernis : le NORMAL, puis du moins au plus rare. */
export const FINISH_ORDER: CardVariant[] = [
  'NORMAL',
  'BRILLIANT',
  'HOLOGRAPHIC',
]

const FINISH_RARITIES: Card['rarity'][] = ['RARE', 'EPIC', 'LEGENDARY']

/** Seules les cartes Rare et au-dessus se tirent en brillante ou en holo. */
export function hasFinishes(rarity: Card['rarity']): boolean {
  return FINISH_RARITIES.includes(rarity)
}

/** Vernis possibles d'une carte : 3 pour une Rare+, 1 (le normal) sinon. */
export function finishesPerCard(rarity: Card['rarity']): number {
  return hasFinishes(rarity) ? FINISH_ORDER.length : 1
}

/** Vernis débloqués d'une carte possédée, NORMAL compris. */
export function ownedFinishCount(uc: UserCard): number {
  return 1 + uc.finishes.length
}

export function buildDisplayEntries(
  allCards: Card[],
  userCards: UserCard[],
): DisplayEntry[] {
  const owned = new Map(userCards.map((uc) => [uc.card.id, uc]))
  return allCards.map((card) => {
    const uc = owned.get(card.id)
    return {
      key: card.id,
      card: uc?.card ?? card,
      variant: uc?.displayedFinish ?? 'NORMAL',
      finishes: uc?.finishes ?? [],
      quantity: uc?.quantity ?? 0,
      isOwned: uc !== undefined,
      userCard: uc ?? null,
    }
  })
}

/**
 * Clé d'entrée depuis le paramètre `?card=`. Les liens partagés quand chaque
 * variante avait sa tuile portent un suffixe `-VARIANTE` : on le retire.
 */
export function entryKeyFromSearch(card: string): string {
  return card.replace(/-(NORMAL|BRILLIANT|HOLOGRAPHIC)$/, '')
}

export type FinishFilter = 'all' | 'BRILLIANT' | 'HOLOGRAPHIC' | 'missing'

export const FINISH_FILTER_VALUES: FinishFilter[] = [
  'all',
  'BRILLIANT',
  'HOLOGRAPHIC',
  'missing',
]

export function matchesFinishFilter(
  e: DisplayEntry,
  filter: FinishFilter,
): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'missing') {
    return (
      hasFinishes(e.card.rarity) && e.finishes.length < FINISH_ORDER.length - 1
    )
  }
  return e.finishes.includes(filter)
}

// Puissance d'une entrée, équipement inclus. `bonusByCardId` mappe l'id de
// carte possédée vers ses bonus d'équipement ; absent (ex. collection d'un
// autre joueur, dont on ne connaît pas l'équipement), on retombe sur la
// puissance de base. Les non-possédées renvoient -1 pour tomber en fin de
// groupe sur le tri décroissant.
function entryPower(
  e: DisplayEntry,
  curve: StatCurve,
  bonusByCardId?: Map<string, StatBonuses>,
): number {
  const uc = e.userCard
  if (!uc) {
    return -1
  }
  const bonuses = bonusByCardId?.get(uc.id) ?? emptyStatBonuses()
  return cardPower(e.card, uc.level, uc.finishes, uc.palier, bonuses, curve)
}

// Tri appliqué à l'intérieur de chaque groupe. `default` préserve l'ordre
// existant ; les entrées non possédées (level/quantity absents) tombent en
// fin de groupe pour les tris numériques.
export function sortEntries(
  entries: DisplayEntry[],
  sort: SortMode,
  curve: StatCurve,
  bonusByCardId?: Map<string, StatBonuses>,
): DisplayEntry[] {
  if (sort === 'default') {
    return entries
  }
  const sorted = [...entries]
  if (sort === 'power') {
    sorted.sort(
      (a, b) =>
        entryPower(b, curve, bonusByCardId) -
        entryPower(a, curve, bonusByCardId),
    )
  } else if (sort === 'level') {
    sorted.sort((a, b) => (b.userCard?.level ?? 0) - (a.userCard?.level ?? 0))
  } else if (sort === 'copies') {
    sorted.sort((a, b) => b.quantity - a.quantity)
  } else {
    sorted.sort((a, b) =>
      a.card.name.localeCompare(b.card.name, currentLocale()),
    )
  }
  return sorted
}
