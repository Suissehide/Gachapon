import { describe, expect, it } from '@jest/globals'

import type { ScoringConfig } from '../../../generated/client'
import {
  betMultiplier,
  betPayout,
  betMultiplierForSide,
  betVerdict,
  betVerdictForSide,
  liveOdds,
  settleMarket,
  duelScoreHalfPoints,
  duelVerdict,
  firstQualifyingIndex,
  rarityAtLeast,
  rarityAtLeastProbability,
  windowProbability,
} from '../../../main/domain/wagers/wager-rules'

// Barème par défaut du jeu (prisma : ScoringConfig singleton).
const SCORING = {
  id: 'singleton',
  commonPoints: 1,
  uncommonPoints: 3,
  rarePoints: 8,
  epicPoints: 20,
  legendaryPoints: 50,
  brilliantMultiplier: 1.5,
  holographicMultiplier: 2.0,
  updatedAt: new Date(),
} as ScoringConfig

describe('wager-rules — ordre de rareté', () => {
  it('rarityAtLeast compare selon l\'ordre du jeu', () => {
    expect(rarityAtLeast('EPIC', 'RARE')).toBe(true)
    expect(rarityAtLeast('RARE', 'RARE')).toBe(true)
    expect(rarityAtLeast('UNCOMMON', 'RARE')).toBe(false)
    expect(rarityAtLeast('LEGENDARY', 'LEGENDARY')).toBe(true)
  })
})

describe('wager-rules — score de duel', () => {
  it('additionne le barème et rend des DEMI-POINTS', () => {
    // rare normale 8 + épique brillante 20×1,5=30 + commune holo 1×2=2 → 40
    const pulls = [
      { rarity: 'RARE' as const, variant: 'NORMAL' as const },
      { rarity: 'EPIC' as const, variant: 'BRILLIANT' as const },
      { rarity: 'COMMON' as const, variant: 'HOLOGRAPHIC' as const },
    ]
    expect(duelScoreHalfPoints(pulls, SCORING)).toBe(80)
  })

  it('conserve la demi-unité qu\'un arrondi entier perdrait', () => {
    // commune brillante = 1 × 1,5 = 1,5 → 3 demi-points, pas 1 ni 2
    expect(
      duelScoreHalfPoints(
        [{ rarity: 'COMMON' as const, variant: 'BRILLIANT' as const }],
        SCORING,
      ),
    ).toBe(3)
  })

  it('aucun tirage vaut zéro', () => {
    expect(duelScoreHalfPoints([], SCORING)).toBe(0)
  })
})

describe('wager-rules — verdict de duel', () => {
  const base = {
    challengerScore: 0,
    opponentScore: 0,
    challengerPulls: 0,
    opponentPulls: 0,
    pullCount: 5,
    now: new Date('2026-09-09T12:00:00Z'),
    deadlineAt: new Date('2026-09-10T12:00:00Z'),
  }

  it('null tant que les deux n\'ont pas fini et que l\'échéance n\'est pas passée', () => {
    expect(duelVerdict({ ...base, challengerPulls: 5, opponentPulls: 2 })).toBeNull()
  })

  it('tranche dès que les deux ont fait leurs tirages', () => {
    expect(
      duelVerdict({ ...base, challengerPulls: 5, opponentPulls: 5, challengerScore: 40, opponentScore: 30 }),
    ).toBe('CHALLENGER')
    expect(
      duelVerdict({ ...base, challengerPulls: 5, opponentPulls: 5, challengerScore: 10, opponentScore: 30 }),
    ).toBe('OPPONENT')
  })

  it('égalité de score = TIE, pas un vainqueur arbitraire', () => {
    expect(
      duelVerdict({ ...base, challengerPulls: 5, opponentPulls: 5, challengerScore: 30, opponentScore: 30 }),
    ).toBe('TIE')
  })

  it('à l\'échéance, tranche même avec des tirages manquants', () => {
    const past = { ...base, now: new Date('2026-09-11T12:00:00Z') }
    expect(
      duelVerdict({ ...past, challengerPulls: 3, opponentPulls: 0, challengerScore: 8, opponentScore: 0 }),
    ).toBe('CHALLENGER')
  })

  it('à l\'échéance sans aucun tirage des deux côtés, c\'est une égalité', () => {
    const past = { ...base, now: new Date('2026-09-11T12:00:00Z') }
    expect(duelVerdict(past)).toBe('TIE')
  })

  it('une échéance nulle (duel non encore accepté) ne tranche jamais', () => {
    expect(duelVerdict({ ...base, deadlineAt: null })).toBeNull()
  })
})

describe('wager-rules — probabilités', () => {
  const cards = [
    { rarity: 'COMMON' as const, dropWeight: 70 },
    { rarity: 'RARE' as const, dropWeight: 25 },
    { rarity: 'EPIC' as const, dropWeight: 5 },
  ]

  it('q = part de poids des raretés au moins égales à la cible', () => {
    // sans chance ni boost : (25+5)/100 = 0,3
    expect(rarityAtLeastProbability(cards, 1, [], 'RARE')).toBeCloseTo(0.3, 6)
    expect(rarityAtLeastProbability(cards, 1, [], 'EPIC')).toBeCloseTo(0.05, 6)
  })

  it('le multiplicateur de chance ne s\'applique qu\'à RARE et au-dessus', () => {
    // chance ×2 : rare 50, épique 10, commune inchangée 70 → 60/130
    expect(rarityAtLeastProbability(cards, 2, [], 'RARE')).toBeCloseTo(60 / 130, 6)
  })

  it('un boost ciblé déplace bien les poids', () => {
    // boost ×3 sur EPIC : commune 70, rare 25, épique 15 → 40/110
    const boosts = [{ weightMultiplier: 3, weightRarity: 'EPIC' as const }]
    expect(rarityAtLeastProbability(cards, 1, boosts, 'RARE')).toBeCloseTo(40 / 110, 6)
  })

  it('un catalogue vide donne 0 plutôt qu\'une division par zéro', () => {
    expect(rarityAtLeastProbability([], 1, [], 'RARE')).toBe(0)
  })

  it('windowProbability compose sur N tirages', () => {
    expect(windowProbability(0.3, 1)).toBeCloseTo(0.3, 6)
    expect(windowProbability(0.3, 10)).toBeCloseTo(1 - 0.7 ** 10, 6)
    expect(windowProbability(0, 10)).toBe(0)
    expect(windowProbability(1, 10)).toBe(1)
  })
})

describe('wager-rules — cote', () => {
  it('applique la marge maison et arrondit au centième', () => {
    // p = 0,5 ; marge 10 % → 0,9 / 0,5 = 1,8
    expect(betMultiplier(0.5, 10)).toBe(1.8)
  })

  it('ne descend jamais sous 1,00', () => {
    // p = 1 (pitié garantie) → 0,9 → plancher 1
    expect(betMultiplier(1, 10)).toBe(1)
  })

  it('une probabilité nulle ne produit ni Infinity ni NaN', () => {
    expect(Number.isFinite(betMultiplier(0, 10))).toBe(true)
  })

  it('betPayout arrondit à l\'entier, mise incluse', () => {
    expect(betPayout(100, 1.8)).toBe(180)
    expect(betPayout(50, 1.33)).toBe(67)
  })
})

describe('wager-rules — verdict de pari', () => {
  const base = {
    minRarity: 'EPIC' as const,
    pullWindow: 10,
    now: new Date('2026-09-09T12:00:00Z'),
    deadlineAt: new Date('2026-09-12T12:00:00Z'),
  }
  const common = { rarity: 'COMMON' as const }

  it('firstQualifyingIndex trouve le premier tirage au niveau visé', () => {
    expect(firstQualifyingIndex([common, { rarity: 'EPIC' }, common], 'EPIC')).toBe(1)
    expect(firstQualifyingIndex([common, common], 'EPIC')).toBe(-1)
    expect(firstQualifyingIndex([{ rarity: 'LEGENDARY' }], 'EPIC')).toBe(0)
  })

  it('gagné dès le premier tirage qualifiant, même fenêtre incomplète', () => {
    expect(betVerdict({ ...base, pulls: [common, { rarity: 'LEGENDARY' }] })).toBe('WON')
  })

  it('en cours tant que la fenêtre n\'est pas pleine', () => {
    expect(betVerdict({ ...base, pulls: [common, common] })).toBeNull()
  })

  it('perdu quand la fenêtre est pleine sans succès', () => {
    expect(betVerdict({ ...base, pulls: Array(10).fill(common) })).toBe('LOST')
  })

  it('expiré (donc remboursé) seulement si la cible n\'a fait AUCUN tirage', () => {
    const past = { ...base, now: new Date('2026-09-13T12:00:00Z') }
    expect(betVerdict({ ...past, pulls: [] })).toBe('EXPIRED')
  })

  describe('cote selon le sens', () => {
    it('le NON se cote sur l\'evenement complementaire', () => {
      // p = 0,4 : le OUI vaut 0,9/0,4 = 2,25 et le NON 0,9/0,6 = 1,5.
      expect(betMultiplierForSide(0.4, 'YES', 10)).toBe(2.25)
      expect(betMultiplierForSide(0.4, 'NO', 10)).toBe(1.5)
    })

    it('couvrir les DEUX sens reste a esperance negative', () => {
      // La propriete qui rend le couple de cotes non arbitrable : deux
      // comptes d'une meme equipe qui prennent chacun un sens pour la meme
      // mise doivent perdre la commission, pas rentrer dans leurs frais.
      // C'est une ESPERANCE, pas un gain maximum : le OUI sur un evenement
      // rare paie tres gros, rarement.
      const STAKE = 100
      for (const p of [0.2, 0.4, 0.5, 0.6, 0.75]) {
        const yes = betMultiplierForSide(p, 'YES', 10)
        const no = betMultiplierForSide(p, 'NO', 10)
        // Les deux doivent etre placables, sinon la comparaison ne dit rien :
        // un sens refuse au placement ne se couvre pas.
        expect(yes).toBeGreaterThan(1)
        expect(no).toBeGreaterThan(1)
        const expected = p * STAKE * yes + (1 - p) * STAKE * no
        expect(expected).toBeLessThan(2 * STAKE)
      }
    })

    it('sur une rarete tres improbable, le NON tombe au plancher', () => {
      // 1 - p frole 1, la cote brute passe sous 1 et se fait plafonner : le
      // placement refusera ce pari, et c'est voulu.
      expect(betMultiplierForSide(0.002, 'NO', 10)).toBe(1)
    })
  })

  describe('cote courante du marche', () => {
    // p = 0,4 : theorique OUI 2,25, theorique NON 1,5.
    it('un camp seul garde sa cote theorique', () => {
      expect(liveOdds(100, 0, 'YES', 0.4, 10)).toBe(2.25)
      expect(liveOdds(0, 0, 'NO', 0.4, 10)).toBe(1.5)
    })

    it('le camp delaisse rapporte plus a mesure que l\'autre grossit', () => {
      const petit = liveOdds(100, 900, 'YES', 0.4, 10)
      const gros = liveOdds(900, 100, 'YES', 0.4, 10)
      expect(petit).toBeGreaterThan(gros)
      // 1000 x 0,9 / 100 = 9 pour le camp minoritaire.
      expect(petit).toBe(9)
    })

    it('la cote theorique est un PLANCHER, jamais un plafond', () => {
      // Camp majoritaire ecrasant : le pot ne rendrait que 0,99 par unite,
      // donc moins que la mise. Sans le plancher, miser du bon cote pourrait
      // faire PERDRE de la poussiere — et un camp adverse vide paierait mieux
      // qu'un camp adverse a une poussiere.
      expect(liveOdds(1000, 1, 'YES', 0.4, 10)).toBe(2.25)
      expect(liveOdds(1000, 0, 'YES', 0.4, 10)).toBe(2.25)
    })
  })

  describe('partage du pot', () => {
    const FLOOR = { YES: 1.5, NO: 3 }
    const e = (id: string, side: 'YES' | 'NO', stake: number) => ({
      id,
      userId: `u-${id}`,
      side,
      stake,
    })

    it('le camp gagnant se partage le pot au prorata, commission deduite', () => {
      // 300 sur OUI (200 + 100), 300 sur NON. Pot 600, moins 10 % = 540.
      const out = settleMarket(
        [e('a', 'YES', 200), e('b', 'YES', 100), e('c', 'NO', 300)],
        'YES',
        FLOOR,
        10,
      )
      expect(out.get('a')?.payout).toBe(360)
      expect(out.get('b')?.payout).toBe(180)
      expect(out.get('c')?.payout).toBe(0)
      // La maison garde bien sa marge : 360 + 180 = 540, pas 600.
      expect(360 + 180).toBe(540)
    })

    it('la cote theorique est un plancher quand le pot est maigre', () => {
      // 1000 sur OUI contre 10 sur NON : la part du pot rendrait moins que la
      // mise. Le plancher a 1,5 la releve.
      const out = settleMarket(
        [e('a', 'YES', 1000), e('b', 'NO', 10)],
        'YES',
        FLOOR,
        10,
      )
      expect(out.get('a')?.payout).toBe(1500)
    })

    it("sans tirage du tout, TOUT le monde est rembourse", () => {
      // Le garde-fou du « non » : sans lui, parier contre un coequipier
      // inactif serait de l'argent gratuit. Rendre `winner` non nul ici fait
      // tomber ce test.
      const out = settleMarket(
        [e('a', 'YES', 200), e('b', 'NO', 50)],
        null,
        FLOOR,
        10,
      )
      expect(out.get('a')?.payout).toBe(200)
      expect(out.get('b')?.payout).toBe(50)
    })

    it('un camp gagnant vide ne paie personne et ne divise pas par zero', () => {
      const out = settleMarket([e('a', 'YES', 200)], 'NO', FLOOR, 10)
      expect(out.get('a')?.payout).toBe(0)
    })

    it('chaque mise recoit une ligne, meme perdante', () => {
      const out = settleMarket(
        [e('a', 'YES', 200), e('b', 'NO', 50)],
        'YES',
        FLOOR,
        10,
      )
      expect(out.size).toBe(2)
      expect(out.get('b')).toEqual({ userId: 'u-b', payout: 0 })
    })
  })

  describe('sens du pari', () => {
    it('le NON inverse gagné et perdu', () => {
      const won = { ...base, pulls: [common, { rarity: 'LEGENDARY' as const }] }
      expect(betVerdictForSide(won, 'YES')).toBe('WON')
      expect(betVerdictForSide(won, 'NO')).toBe('LOST')

      const lost = { ...base, pulls: Array(10).fill(common) }
      expect(betVerdictForSide(lost, 'YES')).toBe('LOST')
      expect(betVerdictForSide(lost, 'NO')).toBe('WON')
    })

    it("l'absence totale de tirages rembourse les DEUX sens", () => {
      // LE point critique du « non ». Sans cette exception, parier « non » sur
      // un coéquipier qui ne joue pas serait de l'argent gratuit : on choisit
      // un inactif, on parie qu'il ne sortira rien, on encaisse. Inverser
      // EXPIRED en WON fait tomber ce test.
      const past = { ...base, now: new Date('2026-09-13T12:00:00Z'), pulls: [] }
      expect(betVerdictForSide(past, 'YES')).toBe('EXPIRED')
      expect(betVerdictForSide(past, 'NO')).toBe('EXPIRED')
    })

    it("l'indécis reste indécis des deux côtés", () => {
      const open = { ...base, pulls: [common, common] }
      expect(betVerdictForSide(open, 'YES')).toBeNull()
      expect(betVerdictForSide(open, 'NO')).toBeNull()
    })
  })

  it('perdu si la cible a tiré puis s\'est arrêtée avant la fin de la fenêtre', () => {
    // Cas historiquement remboursé : il rendait le pari IMPERDABLE (gagné si
    // une carte qualifiante sortait, remboursé sinon). Voir betVerdict.
    const past = { ...base, now: new Date('2026-09-13T12:00:00Z') }
    expect(betVerdict({ ...past, pulls: [common, common] })).toBe('LOST')
  })

  it('un succès déjà obtenu l\'emporte sur une échéance passée', () => {
    const past = { ...base, now: new Date('2026-09-13T12:00:00Z') }
    expect(betVerdict({ ...past, pulls: [{ rarity: 'EPIC' }] })).toBe('WON')
  })
})
