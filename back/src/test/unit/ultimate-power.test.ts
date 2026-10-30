import { describe, expect, it } from '@jest/globals'

import { CARD_ARCHETYPES } from '../../main/types/domain/combat/archetype.types'
import { type Comp, COMPS } from '../helpers/passive-power'
import { ultimateValuePct, ultimateWinRate } from '../helpers/ultimate-power'

/**
 * INVARIANT : les sept ultimes se valent, et aucun ne pèse plus qu'un passif
 * (3–8 % de stats d'équipe pour un épique, 5–12 % pour un légendaire).
 *
 * Mesuré par scripts/ultimate-bench.ts. Les ultimes d'attaque sont stables
 * d'une composition à l'autre (6 à 7 %) ; bouclier et soin ne valent presque
 * rien dans un combat court (mixte) et beaucoup dans un combat long
 * (défensive) : ce sont des ultimes de situation, calibrés sur la MOYENNE des
 * deux compositions. Par composition, on garde seulement qu'ils ne nuisent
 * jamais (≥ 0 %) et ne dépassent jamais le plafond légendaire (12 %).
 */
const PLAFOND_PCT = 12
const COMBATS = 200
const BANDE_MOYENNE = { min: 4, max: 9 }
const RATIO_MAX = 1.5

describe('puissance des ultimes', () => {
  for (const archetype of CARD_ARCHETYPES) {
    for (const comp of Object.keys(COMPS) as Comp[]) {
      it(`${archetype} vaut moins de ${PLAFOND_PCT} % de stats d'équipe (${comp})`, () => {
        const h = 1 / (1 + PLAFOND_PCT / 100)
        expect(ultimateWinRate(archetype, comp, h, COMBATS)).toBeLessThan(0.5)
      })
      it(`${archetype} ne nuit jamais à son équipe (${comp})`, () => {
        expect(ultimateWinRate(archetype, comp, 1, COMBATS)).toBeGreaterThanOrEqual(0.5)
      })
    }
  }

  it(`chaque ultime vaut entre ${BANDE_MOYENNE.min} et ${BANDE_MOYENNE.max} % en moyenne, et aucun ne vaut plus de ${RATIO_MAX}× le plus faible`, () => {
    const valeurs = CARD_ARCHETYPES.map((a) => {
      const m = ultimateValuePct(a, 'mixte', 150)
      const d = ultimateValuePct(a, 'defensive', 150)
      return { archetype: a, valeur: (m + d) / 2 }
    })
    for (const { archetype, valeur } of valeurs) {
      expect({ archetype, valeur }).toEqual({
        archetype,
        valeur: expect.any(Number),
      })
      expect(valeur).toBeGreaterThanOrEqual(BANDE_MOYENNE.min)
      expect(valeur).toBeLessThanOrEqual(BANDE_MOYENNE.max)
    }
    const max = Math.max(...valeurs.map((v) => v.valeur))
    const min = Math.min(...valeurs.map((v) => v.valeur))
    expect(max / min).toBeLessThanOrEqual(RATIO_MAX)
  })
})
