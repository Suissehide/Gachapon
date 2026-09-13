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
    input.deadlineAt !== null &&
    input.now.getTime() >= input.deadlineAt.getTime()
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
export type BetSideKey = 'YES' | 'NO'

export function betMultiplier(p: number, houseFeePct: number): number {
  if (p <= 0) {
    return 1
  }
  const raw = (100 - houseFeePct) / 100 / p
  return Math.max(1, Math.round(raw * 100) / 100)
}

/**
 * Cote du sens choisi. Le « non » se cote sur l'évènement complémentaire, et
 * la commission s'applique des DEUX côtés : c'est elle qui garde les deux
 * paris à espérance négative. Sans elle, `1/p` et `1/(1-p)` formeraient un
 * couple parfaitement équitable, et un joueur qui prendrait les deux sens
 * pour la même mise s'en sortirait à somme nulle plutôt qu'en perdant la
 * marge — la maison ne gagnerait rien et le pari cesserait d'être un pari.
 *
 * Le plancher de `betMultiplier` fait le reste du travail : sur une rareté
 * très improbable, `1 - p` frôle 1, la cote du « non » tombe sous 1 et se
 * fait plafonner — le pari est alors refusé au placement, ce qui est voulu.
 * Le « non » n'a d'intérêt que là où le « oui » a de vraies chances.
 */
export function betMultiplierForSide(
  probability: number,
  side: BetSideKey,
  houseFeePct: number,
): number {
  return betMultiplier(
    side === 'YES' ? probability : 1 - probability,
    houseFeePct,
  )
}

/**
 * Somme des mises d'un camp.
 */
export function poolOf(
  entries: Array<{ side: BetSideKey; stake: number }>,
  side: BetSideKey,
): number {
  return entries
    .filter((entry) => entry.side === side)
    .reduce((sum, entry) => sum + entry.stake, 0)
}

/**
 * Cote COURANTE d'un camp : ce que rapporterait une mise unitaire si ce camp
 * l'emportait, dans l'état actuel du marché.
 *
 * Deux termes, et c'est le MEILLEUR des deux qui compte :
 *
 *  - le pot — le total moins la commission, partagé au prorata du camp
 *    gagnant. Il récompense d'avoir pris le camp délaissé ;
 *  - la cote théorique, tirée des vraies chances de la cible. Elle sert de
 *    PLANCHER, tenu par la maison.
 *
 * Le plancher n'est pas un confort, il ferme une marche absurde : sans lui,
 * un camp adverse VIDE paierait la cote théorique pleine, tandis qu'un camp
 * adverse à une seule poussière ne paierait presque rien. Le gagnant aurait
 * intérêt à ce que personne ne le contredise plutôt qu'à peine.
 *
 * Conséquence assumée : sur une équipe peu active, la plupart des marchés
 * n'auront qu'un camp et se comporteront exactement comme les paris à cote
 * fixe d'avant — c'est le bon repli.
 */
export function liveOdds(
  poolYes: number,
  poolNo: number,
  side: BetSideKey,
  probability: number,
  houseFeePct: number,
): number {
  const theoretical = betMultiplierForSide(probability, side, houseFeePct)
  const mine = side === 'YES' ? poolYes : poolNo
  if (mine <= 0) {
    return theoretical
  }
  const total = poolYes + poolNo
  const share = (total * (100 - houseFeePct)) / 100 / mine
  return Math.max(theoretical, Math.round(share * 100) / 100)
}

export type MarketEntry = {
  id: string
  userId: string
  side: BetSideKey
  stake: number
}

/**
 * Répartit le pot d'un marché réglé. Rend une entrée par mise, y compris
 * celles qui touchent zéro : le règlement écrit `payout` sur chacune, et une
 * mise perdante à `0` se distingue d'une mise jamais réglée.
 *
 * `winner` à `null` signifie que l'évènement n'a pas eu lieu du tout — la
 * cible n'a fait aucun tirage — et tout le monde est remboursé à l'identique,
 * quel que soit son camp. C'est ce cas, et lui seul, qui empêche de parier
 * « non » sur un coéquipier inactif pour encaisser sans risque.
 *
 * Chaque gagnant touche le MEILLEUR de deux montants : sa part du pot, ou sa
 * mise à la cote théorique. Le second est un plancher tenu par la maison —
 * voir `liveOdds` pour la raison, qui n'est pas la générosité mais la
 * suppression d'une marche absurde entre « camp adverse vide » et « camp
 * adverse à une poussière ».
 */
export function settleMarket(
  entries: MarketEntry[],
  winner: BetSideKey | null,
  floorMultiplier: Record<BetSideKey, number>,
  houseFeePct: number,
): Map<string, { userId: string; payout: number }> {
  const out = new Map<string, { userId: string; payout: number }>()

  if (winner === null) {
    for (const entry of entries) {
      out.set(entry.id, { userId: entry.userId, payout: entry.stake })
    }
    return out
  }

  const poolWin = poolOf(entries, winner)
  const total = entries.reduce((sum, entry) => sum + entry.stake, 0)
  const sharable = (total * (100 - houseFeePct)) / 100

  for (const entry of entries) {
    if (entry.side !== winner || poolWin <= 0) {
      out.set(entry.id, { userId: entry.userId, payout: 0 })
      continue
    }
    const share = Math.round((entry.stake / poolWin) * sharable)
    const floor = Math.round(entry.stake * floorMultiplier[entry.side])
    out.set(entry.id, {
      userId: entry.userId,
      payout: Math.max(share, floor),
    })
  }
  return out
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
/**
 * Le verdict vu du SENS pari. Le calcul reste celui du « oui » —
 * `betVerdict` ci-dessous — et le « non » se contente de l'inverser.
 *
 * `EXPIRED` ne s'inverse PAS, et c'est la règle qui tient tout l'équilibre du
 * « non ». Une cible qui n'a fait aucun tirage rembourse les deux sens.
 * L'inverser en `WON` ferait du « non » de l'argent gratuit : on choisit un
 * coéquipier qui ne joue pas, on parie qu'il ne sortira rien, on encaisse
 * sans risque — exactement la faille que le remboursement du « oui » avait
 * déjà ouverte une fois, et qu'il a fallu refermer.
 *
 * `null` ne s'inverse pas non plus : indécidable d'un côté l'est de l'autre.
 */
export function betVerdictForSide(
  input: BetVerdictInput,
  side: BetSideKey,
): 'WON' | 'LOST' | 'EXPIRED' | null {
  const verdict = betVerdict(input)
  if (side === 'YES' || verdict === null || verdict === 'EXPIRED') {
    return verdict
  }
  return verdict === 'WON' ? 'LOST' : 'WON'
}

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
