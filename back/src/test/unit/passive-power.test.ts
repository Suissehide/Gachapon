import { describe, expect, it } from '@jest/globals'
import { PASSIVES, type PassiveKey } from '../../main/domain/combat/passives'
import { type GearedBench, gearedWinRate } from '../helpers/passive-power'

/**
 * INVARIANT : chaque passif vaut quelque chose, et aucun ne vaut plus qu'un
 * plafond de stats d'équipe, mesuré sur un joueur ÉQUIPÉ. Le miroir sans
 * stuff qui servait ici ne décrit aucune situation réelle passé les premiers
 * niveaux : ses combats durent trois fois plus longtemps, et tout effet par
 * action (soins, DoT, charges) y pesait trois fois trop.
 *
 * Deux points de la progression (`gearedWinRate`) : le sommet de la tour
 * (étage 15, combats courts, la rafale l'emporte) et le mi-parcours (10-5,
 * combats plus longs). Fourchette visée 3-8 % (épique) et 5-12 %
 * (légendaire), mesurée par `BENCH=tower|campaign npx tsx
 * scripts/passive-bench.ts`. Plancher sur le porteur Mage (le passif doit
 * valoir quelque chose sur la carte qui en profite le mieux), plafond sur
 * Mage et Soutien. Entrave et Étourdissement restent au-dessus à
 * mi-parcours : repousser la jauge pèse d'autant plus que le combat dure.
 *
 * Le test : avec PV et ATQ divisés par (1 + seuil), l'équipe porteuse doit
 * gagner au moins autant (plancher) ou moins souvent (plafond) que l'équipe
 * sans passif. Seeds fixes : le résultat ne bouge qu'avec le code.
 */
const BANDE_PCT: Record<
  GearedBench,
  Record<'EPIC' | 'LEGENDARY', { plancher: number; plafond: number }>
> = {
  tower: {
    EPIC: { plancher: 1.5, plafond: 12 },
    LEGENDARY: { plancher: 2.5, plafond: 16 },
  },
  campaign: {
    EPIC: { plancher: 1.5, plafond: 16 },
    LEGENDARY: { plancher: 2.5, plafond: 16 },
  },
}
const COMBATS = 200

for (const bench of Object.keys(BANDE_PCT) as GearedBench[]) {
  describe(`puissance des passifs — banc équipé ${bench}`, () => {
    for (const key of Object.keys(PASSIVES) as PassiveKey[]) {
      const bande = BANDE_PCT[bench][PASSIVES[key].rarityHint]
      it(`${key} vaut au moins ${bande.plancher} % de stats d'équipe (Mage)`, () => {
        const h = 1 / (1 + bande.plancher / 100)
        expect(gearedWinRate(key, 0, h, COMBATS, bench)).toBeGreaterThanOrEqual(
          gearedWinRate(null, 0, 1, COMBATS, bench),
        )
      })
      for (const [slot, porteur] of [
        [0, 'Mage'],
        [2, 'Soutien'],
      ] as const) {
        it(`${key} vaut moins de ${bande.plafond} % de stats d'équipe (${porteur})`, () => {
          const h = 1 / (1 + bande.plafond / 100)
          expect(gearedWinRate(key, slot, h, COMBATS, bench)).toBeLessThan(
            gearedWinRate(null, slot, 1, COMBATS, bench),
          )
        })
      }
    }
  })
}
