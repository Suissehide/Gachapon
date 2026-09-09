import type {
  CardRarity,
  CardVariant,
  ScoringConfig,
} from '../../../generated/client'
import { weightFor } from '../gacha/gacha.domain'
import { calculateUserScore } from '../scoring/scoring.domain'

/** Ordre croissant des raretés du jeu — source unique des comparaisons. */
export const RARITY_ORDER: readonly CardRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as CardRarity[]

export function rarityAtLeast(rarity: CardRarity, min: CardRarity): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(min)
}

export type ScoredPull = { rarity: CardRarity; variant: CardVariant }

/**
 * Score d'un lot de tirages, en DEMI-POINTS. Le barème applique ×1,5 aux
 * brillantes, ce qui produit des demi-unités : les stocker doublés garde une
 * colonne entière sans perdre la précision d'un arrondi.
 *
 * Délègue à `calculateUserScore` plutôt que de recopier le barème : le duel
 * et le classement de collection doivent bouger ensemble.
 */
export function duelScoreHalfPoints(
  pulls: ScoredPull[],
  scoring: ScoringConfig,
): number {
  const asCards = pulls.map((p) => ({
    card: { rarity: p.rarity },
    variant: p.variant,
    quantity: 1,
  }))
  return Math.round(calculateUserScore(asCards, scoring) * 2)
}

export type DuelVerdictInput = {
  challengerScore: number
  opponentScore: number
  challengerPulls: number
  opponentPulls: number
  pullCount: number
  now: Date
  deadlineAt: Date | null
}

/**
 * `null` tant que le duel ne peut pas être tranché : soit les deux joueurs
 * n'ont pas fini leurs tirages, soit l'échéance n'est pas atteinte. À
 * l'échéance on compare les scores tels quels, un tirage non fait valant
 * zéro.
 */
export function duelVerdict(
  input: DuelVerdictInput,
): 'CHALLENGER' | 'OPPONENT' | 'TIE' | null {
  const bothDone =
    input.challengerPulls >= input.pullCount &&
    input.opponentPulls >= input.pullCount
  const expired =
    input.deadlineAt !== null && input.now.getTime() >= input.deadlineAt.getTime()
  if (!bothDone && !expired) {
    return null
  }
  if (input.challengerScore > input.opponentScore) {
    return 'CHALLENGER'
  }
  if (input.opponentScore > input.challengerScore) {
    return 'OPPONENT'
  }
  return 'TIE'
}

type OddsCard = { rarity: CardRarity; dropWeight: number }

/**
 * Probabilité qu'UN tirage de la cible sorte au moins `minRarity`, calculée
 * sur les MÊMES poids que le tirage réel (`weightFor`) : chance du skill tree
 * et boosts actifs compris. Sans cela la cote annoncée mentirait sur les
 * chances du joueur observé.
 */
export function rarityAtLeastProbability(
  cards: OddsCard[],
  luckMultiplier: number,
  boosts: Array<{ weightMultiplier: number; weightRarity: CardRarity | null }>,
  minRarity: CardRarity,
): number {
  let total = 0
  let favourable = 0
  for (const card of cards) {
    // weightFor ne lit que `rarity` et `dropWeight` ; le cast évite d'exiger
    // une CardWithSet complète là où seuls ces deux champs comptent.
    const w = weightFor(card as never, luckMultiplier, boosts)
    total += w
    if (rarityAtLeast(card.rarity, minRarity)) {
      favourable += w
    }
  }
  return total > 0 ? favourable / total : 0
}

/** Probabilité d'au moins un succès sur `n` tirages indépendants. */
export function windowProbability(q: number, n: number): number {
  return 1 - (1 - q) ** n
}

/**
 * Cote figée au placement. La marge maison garantit que l'espérance reste
 * défavorable au parieur ; le plancher à 1,00 évite une cote nulle quand la
 * pitié rend le succès certain (le front annonce alors « pari sans intérêt »).
 */
export function betMultiplier(p: number, houseFeePct: number): number {
  if (p <= 0) {
    return 1
  }
  const raw = ((100 - houseFeePct) / 100) / p
  return Math.max(1, Math.round(raw * 100) / 100)
}

export function betPayout(stake: number, multiplier: number): number {
  return Math.round(stake * multiplier)
}

export function firstQualifyingIndex(
  pulls: Array<{ rarity: CardRarity }>,
  minRarity: CardRarity,
): number {
  return pulls.findIndex((p) => rarityAtLeast(p.rarity, minRarity))
}

export type BetVerdictInput = {
  pulls: Array<{ rarity: CardRarity }>
  minRarity: CardRarity
  pullWindow: number
  now: Date
  deadlineAt: Date
}

/**
 * Un succès déjà obtenu prime sur tout : une cible qui sort la rareté visée
 * puis disparaît trois jours a quand même fait gagner le parieur.
 *
 * À l'échéance avec une fenêtre INCOMPLÈTE, le remboursement est réservé au
 * cas où la cible n'a fait AUCUN tirage compté : une absence totale, ce pour
 * quoi le remboursement existe. Une cible qui a tiré puis s'est arrêtée à un
 * tirage de la fin fait PERDRE le pari.
 *
 * C'est délibérément plus dur que la lettre de la spec, qui prescrivait le
 * remboursement dès que la fenêtre était incomplète : la même spec pose
 * comme objectif de conception qu'aucun pari ne doit avoir une espérance
 * positive, et la version « remboursé » rendait le pari IMPERDABLE — il
 * gagnait si une carte qualifiante sortait, et se faisait rembourser sinon.
 * Deux comptes d'une même équipe en tiraient une imprimante à poussière sans
 * aucun risque. L'objectif de conception l'emporte sur la lettre.
 */
export function betVerdict(
  input: BetVerdictInput,
): 'WON' | 'LOST' | 'EXPIRED' | null {
  if (firstQualifyingIndex(input.pulls, input.minRarity) !== -1) {
    return 'WON'
  }
  if (input.pulls.length >= input.pullWindow) {
    return 'LOST'
  }
  if (input.now.getTime() >= input.deadlineAt.getTime()) {
    return input.pulls.length === 0 ? 'EXPIRED' : 'LOST'
  }
  return null
}
