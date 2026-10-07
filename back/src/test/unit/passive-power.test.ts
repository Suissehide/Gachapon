import { describe, expect, it } from '@jest/globals'

import { PASSIVES, type PassiveKey } from '../../main/domain/combat/passives'
import { COMPS, type Comp, passiveWinRate } from '../helpers/passive-power'

/**
 * INVARIANT : aucun passif ne vaut plus qu'un plafond de stats d'équipe,
 * selon sa rareté. Avant le recadrage du 2026-10-07, Poison valait ~72 %,
 * Sanctuaire ~60 % et Bénédiction ~50 % en composition défensive, contre
 * 3 à 10 % pour les autres.
 *
 * Fourchette visée (moyenne des deux compositions) : 3–8 % pour un épique,
 * 5–12 % pour un légendaire — mesurée par scripts/passive-bench.ts. Les
 * soins dépassent un peu en défensive (combats longs), d'où la marge du
 * plafond testé ici, composition par composition.
 *
 * Le test : avec PV et ATQ divisés par (1 + plafond), l'équipe porteuse doit
 * perdre plus souvent qu'elle ne gagne.
 */
const PLAFOND_PCT = { EPIC: 10, LEGENDARY: 14 } as const
const COMBATS = 200

describe('puissance des passifs', () => {
  for (const key of Object.keys(PASSIVES) as PassiveKey[]) {
    const plafond = PLAFOND_PCT[PASSIVES[key].rarityHint]
    for (const comp of Object.keys(COMPS) as Comp[]) {
      it(`${key} vaut moins de ${plafond} % de stats d'équipe (${comp})`, () => {
        const h = 1 / (1 + plafond / 100)
        expect(passiveWinRate(key, comp, h, COMBATS)).toBeLessThan(0.5)
      })
    }
  }
})
