export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  REGEN: 'Réduit le temps de régénération des tickets (en minutes)',
  LUCK: 'Multiplie la chance de base lors des tirages',
  DUST_HARVEST: 'Multiplie la quantité de dust obtenue',
  TOKEN_VAULT: 'Augmente la capacité max de tickets',
  FREE_PULL_CHANCE: "Chance d'obtenir un tirage gratuit",
  MULTI_TOKEN_CHANCE: 'Chance de gagner plusieurs tickets à la fois',
  GOLDEN_BALL_CHANCE: "Chance d'obtenir une boule dorée (rareté garantie)",
  SHOP_DISCOUNT: 'Réduction sur les prix de la boutique',
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
