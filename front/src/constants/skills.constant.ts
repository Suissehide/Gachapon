export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  REGEN: 'Réduit le temps de régénération des jetons (en minutes)',
  LUCK: 'Multiplie la chance de base lors des tirages',
  DUST_HARVEST: 'Multiplie la quantité de poussière obtenue',
  TOKEN_VAULT: 'Augmente la capacité max de jetons',
  FREE_PULL_CHANCE: "Chance d'obtenir un tirage gratuit",
  MULTI_TOKEN_CHANCE: 'Chance de gagner plusieurs jetons à la fois',
  GOLDEN_BALL_CHANCE: "Chance d'obtenir une boule dorée (rareté garantie)",
  SHOP_DISCOUNT: 'Réduction sur les prix de la boutique',
  PULL_XP_BONUS: 'XP par tirage',
  PITY_BOOST: 'Réduction du seuil de pitié',
  VARIANT_LUCK: 'Chance de variantes',
  DAILY_SHOP_SLOT: 'Emplacement boutique du jour',
  WISHLIST_COOLDOWN: 'Délai du vœu réduit (en jours)',
  PC_VAULT: 'Stock max de PC',
  PC_REGEN: 'Régénération de PC (en secondes)',
  SWEEP_COST: 'Coût de sweep réduit',
  GOLD_BONUS: 'Or de combat bonus',
  COMBAT_XP_BONUS: 'XP de combat bonus',
  DROP_BONUS: 'Chance de butin bonus',
}

export const EFFECT_TYPES = Object.keys(EFFECT_DESCRIPTIONS)

export const EFFECT_OPTIONS = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

export const BRANCH_PALETTE = [
  '#6c47ff',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#a855f7',
]
