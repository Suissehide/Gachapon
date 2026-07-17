export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  REGEN: 'Réduit le temps de régénération des jetons',
  LUCK: 'Augmente les chances de raretés élevées au tirage',
  DUST_HARVEST: 'Augmente la poussière obtenue au recyclage',
  TOKEN_VAULT: 'Augmente la capacité max de jetons',
  FREE_PULL_CHANCE: "Chance d'obtenir un tirage gratuit",
  MULTI_TOKEN_CHANCE: 'Chance de gagner plusieurs jetons à la fois',
  GOLDEN_BALL_CHANCE: "Chance d'obtenir une boule dorée (rareté garantie)",
  SHOP_DISCOUNT: 'Réduction sur les prix en poussière de la boutique',
  PULL_XP_BONUS: "Bonus d'XP par tirage",
  PITY_BOOST: 'Réduction du seuil de pitié',
  VARIANT_LUCK: 'Augmente les chances de variantes Brillant/Holo',
  DAILY_SHOP_SLOT: 'Emplacement bonus à la boutique du jour',
  WISHLIST_COOLDOWN: 'Réduit le délai du vœu',
  PC_VAULT: 'Augmente le stock max de PC',
  PC_REGEN: 'Accélère la régénération des PC',
  SWEEP_COST: 'Réduit le coût du farm',
  GOLD_BONUS: "Bonus d'or sur les victoires",
  COMBAT_XP_BONUS: "Bonus d'XP de combat",
  DROP_BONUS: 'Chance de butin bonus en combat',
  UPGRADE_DUST_DISCOUNT:
    "Réduit le coût en poussière d'amélioration des cartes",
  GOLD_SHOP_DISCOUNT: 'Réduction sur les prix en or de la boutique',
  DAILY_SHOP_LUCK: 'Plus de cartes rares dans ta boutique du jour',
}

export const EFFECT_TYPES = Object.keys(EFFECT_DESCRIPTIONS)

export const EFFECT_OPTIONS = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

export const EFFECT_FORMATTERS: Record<string, (v: number) => string> = {
  REGEN: (v) => `−${v} min`,
  LUCK: (v) => `+${v} %`,
  DUST_HARVEST: (v) => `+${v} %`,
  TOKEN_VAULT: (v) => `+${v} jeton${v > 1 ? 's' : ''}`,
  FREE_PULL_CHANCE: (v) => `${v} %`,
  MULTI_TOKEN_CHANCE: (v) => `${v} %`,
  GOLDEN_BALL_CHANCE: (v) => `${v} %`,
  SHOP_DISCOUNT: (v) => `−${v} %`,
  PULL_XP_BONUS: (v) => `+${v} %`,
  PITY_BOOST: (v) => `−${v} tirage${v > 1 ? 's' : ''}`,
  VARIANT_LUCK: (v) => `+${v} %`,
  DAILY_SHOP_SLOT: (v) => `+${v}`,
  WISHLIST_COOLDOWN: (v) => `−${v} j`,
  PC_VAULT: (v) => `+${v} PC`,
  PC_REGEN: (v) => `−${v} s`,
  SWEEP_COST: (v) => `−${v} PC`,
  GOLD_BONUS: (v) => `+${v} %`,
  COMBAT_XP_BONUS: (v) => `+${v} %`,
  DROP_BONUS: (v) => `+${v} %`,
  UPGRADE_DUST_DISCOUNT: (v) => `−${v} %`,
  GOLD_SHOP_DISCOUNT: (v) => `−${v} %`,
  DAILY_SHOP_LUCK: (v) => `+${v} %`,
}

export function formatEffect(effectType: string, value: number): string {
  const fmt = EFFECT_FORMATTERS[effectType]
  return fmt ? fmt(value) : String(value)
}

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
