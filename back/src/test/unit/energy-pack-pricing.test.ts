import { describe, expect, it } from '@jest/globals'

import {
  CHAPTER_COUNT,
  STAGES_PER_CHAPTER,
  bossLoot,
  lootTableNormal,
} from '../../../prisma/seed/campaign'
import { SHOP_ITEMS } from '../../../prisma/seed/shop'
import { DEFAULTS } from '../../main/infra/config/config.service'

/**
 * Garde-fou du PRIX des packs d'énergie, ancré sur la courbe de butin réelle.
 *
 * Un pack d'énergie s'achète en poussière et rend des points de combat, qui
 * rendent eux-mêmes de la poussière en farmant. Si le prix au point d'énergie
 * descend sous le rendement du meilleur étage, acheter de l'énergie RAPPORTE
 * de la poussière : la boucle s'auto-finance et le plafond journalier devient
 * le seul frein du jeu. C'est l'état mesuré le 2026-09-21 — la Grande recharge
 * coûtait 18 poussière/énergie pour un rendement de 21,6 au boss 9-10, soit
 * 120 % remboursés.
 *
 * Le test lit les DEUX sources réelles (SHOP_ITEMS, butin de campagne) plutôt
 * que des constantes recopiées : rebuffer le butin de farm sans retoucher les
 * packs le fera échouer, ce qui est exactement le but.
 */

/** Poussière par POINT D'ÉNERGIE au meilleur étage de toute la campagne. */
function meilleurRendementParEnergie(): number {
  let meilleur = 0
  for (let chapitre = 1; chapitre <= CHAPTER_COUNT; chapitre++) {
    for (let etage = 1; etage <= STAGES_PER_CHAPTER; etage++) {
      const loot =
        etage === STAGES_PER_CHAPTER
          ? bossLoot(chapitre).farm
          : lootTableNormal(chapitre, etage).farm
      meilleur = Math.max(meilleur, loot.dust)
    }
  }
  return meilleur / DEFAULTS['combat.battleCost']
}

const packs = SHOP_ITEMS.filter((item) => item.type === 'ENERGY_PACK')

describe("prix des packs d'énergie", () => {
  it('trouve bien des packs à contrôler', () => {
    expect(packs.length).toBeGreaterThan(0)
  })

  it("ne laisse aucun pack rapporter plus de poussière qu'il n'en coûte", () => {
    const rendement = meilleurRendementParEnergie()
    for (const pack of packs) {
      const points = (pack.value as { combatPoints?: number }).combatPoints
      expect(points).toBeGreaterThan(0)
      const prixParEnergie = pack.cost / (points as number)
      expect(prixParEnergie).toBeGreaterThan(rendement)
    }
  })

  it('garde une marge d’au moins 2× sur le meilleur rendement de farm', () => {
    // Cible de calibrage : ×2,5. Le seuil du test est à ×2 pour laisser
    // respirer un ajustement de butin sans devenir un test de tautologie.
    const rendement = meilleurRendementParEnergie()
    for (const pack of packs) {
      const points = (pack.value as { combatPoints: number }).combatPoints
      expect(pack.cost / points).toBeGreaterThanOrEqual(2 * rendement)
    }
  })
})
