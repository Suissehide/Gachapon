export type TokenState = {
  tokens: number
  newLastTokenAt: Date | null
  nextTokenAt: Date | null
  /**
   * Jetons produits par le temps écoulé mais perdus faute de place. Toujours
   * calculé, même quand la compétence Trop-plein n'est pas montée : c'est un
   * FAIT sur l'intervalle, pas un effet. La conversion en poussière est la
   * décision de l'appelant.
   */
  overflow: number
}

export type UserUpgradeEffects = {
  regenReductionMinutes: number
  luckMultiplier: number
  dustHarvestMultiplier: number
  tokenVaultBonus: number
  freePullChance: number
  multiTokenChance: number
  goldenBallChance: number
  shopDiscount: number
  pullXpBonus: number
  pityReduction: number
  variantLuckMultiplier: number
  dailyShopSlots: number
  wishlistCooldownReductionDays: number
  pcVaultBonus: number
  pcRegenReductionSeconds: number
  sweepCostReduction: number
  goldBonus: number
  combatXpBonus: number
  dropBonus: number
  upgradeDustDiscount: number
  goldShopDiscount: number
  dailyShopLuckMultiplier: number
  /** Remise (%) sur le coût en or d'amélioration d'équipement, additive au bonus d'équipe `forge`. */
  equipUpgradeDiscount: number
  /** Bonus (%) d'or au recyclage d'équipement. */
  salvageBonus: number
  /**
   * Poussière rendue PAR JETON perdu au plafond de stockage. Zéro = le
   * débordement est jeté en silence, comportement historique.
   */
  tokenOverflowDust: number
  /** Achats de packs d'énergie supplémentaires par jour, au-delà de `shop.energyDailyCap`. */
  energyPackCapBonus: number
  /** « Vœu exaucé » : % de chance de réorienter un tirage vers un vœu de MÊME rareté. */
  wishlistPullChance: number
}
