import { describe, expect, it } from '@jest/globals'

import { wishlistPriceFor } from '../../main/domain/wishlist/wishlist.domain'
import { DEFAULTS } from '../../main/infra/config/config.service'

/**
 * Prix d'un vœu = prix de la boutique du jour pour la rareté × un facteur
 * PROPRE À CETTE RARETÉ. Le facteur mesure une seule chose : ce que coûte le
 * fait de CHOISIR la carte plutôt que de la subir au hasard.
 *
 * Un facteur unique (l'ancien `wishlist.priceMultiplier`, à 2) ne pouvait pas
 * tenir les deux bouts du barème : le monter assez pour que le rare cesse
 * d'être une journée de revenu envoyait le légendaire à 80 jours.
 */

const config = DEFAULTS as unknown as Record<string, number>

describe('prix d’un vœu', () => {
  it('applique le facteur de la rareté au prix de la boutique du jour', () => {
    expect(wishlistPriceFor('COMMON', config)).toBe(600)
    expect(wishlistPriceFor('UNCOMMON', config)).toBe(1800)
    expect(wishlistPriceFor('RARE', config)).toBe(12000)
    expect(wishlistPriceFor('EPIC', config)).toBe(52500)
    expect(wishlistPriceFor('LEGENDARY', config)).toBe(150000)
  })

  it('reste strictement plus cher que la boutique du jour à toute rareté', () => {
    // L'invariant qui justifie l'existence du facteur : choisir doit toujours
    // coûter plus cher que subir. Un facteur tombé sous 1 le violerait en
    // silence, et le vœu deviendrait la façon la MOINS chère d'acheter.
    const prixBoutique: Record<string, number> = {
      COMMON: DEFAULTS.dailyShopPriceCommon,
      UNCOMMON: DEFAULTS.dailyShopPriceUncommon,
      RARE: DEFAULTS.dailyShopPriceRare,
      EPIC: DEFAULTS.dailyShopPriceEpic,
      LEGENDARY: DEFAULTS.dailyShopPriceLegendary,
    }
    for (const [rarete, prix] of Object.entries(prixBoutique)) {
      expect(wishlistPriceFor(rarete, config)).toBeGreaterThan(prix)
    }
  })

  it('ne renvoie jamais de prix négatif sur une rareté inconnue', () => {
    expect(wishlistPriceFor('MYTHIC', config)).toBeGreaterThanOrEqual(0)
  })
})
