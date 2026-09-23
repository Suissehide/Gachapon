import i18n, { currentLocale } from '../i18n/index.ts'
import { formatNumber } from '../libs/utils.ts'

// Résolu une fois au chargement du module — sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`).
export const EFFECT_DESCRIPTIONS: Record<string, string> = {
  REGEN: i18n.t('skills:effectDescriptions.REGEN'),
  LUCK: i18n.t('skills:effectDescriptions.LUCK'),
  DUST_HARVEST: i18n.t('skills:effectDescriptions.DUST_HARVEST'),
  TOKEN_VAULT: i18n.t('skills:effectDescriptions.TOKEN_VAULT'),
  FREE_PULL_CHANCE: i18n.t('skills:effectDescriptions.FREE_PULL_CHANCE'),
  MULTI_TOKEN_CHANCE: i18n.t('skills:effectDescriptions.MULTI_TOKEN_CHANCE'),
  GOLDEN_BALL_CHANCE: i18n.t('skills:effectDescriptions.GOLDEN_BALL_CHANCE'),
  SHOP_DISCOUNT: i18n.t('skills:effectDescriptions.SHOP_DISCOUNT'),
  PULL_XP_BONUS: i18n.t('skills:effectDescriptions.PULL_XP_BONUS'),
  PITY_BOOST: i18n.t('skills:effectDescriptions.PITY_BOOST'),
  VARIANT_LUCK: i18n.t('skills:effectDescriptions.VARIANT_LUCK'),
  DAILY_SHOP_SLOT: i18n.t('skills:effectDescriptions.DAILY_SHOP_SLOT'),
  WISHLIST_SLOTS: i18n.t('skills:effectDescriptions.WISHLIST_SLOTS'),
  PC_VAULT: i18n.t('skills:effectDescriptions.PC_VAULT'),
  PC_REGEN: i18n.t('skills:effectDescriptions.PC_REGEN'),
  SWEEP_COST: i18n.t('skills:effectDescriptions.SWEEP_COST'),
  GOLD_BONUS: i18n.t('skills:effectDescriptions.GOLD_BONUS'),
  COMBAT_XP_BONUS: i18n.t('skills:effectDescriptions.COMBAT_XP_BONUS'),
  DROP_BONUS: i18n.t('skills:effectDescriptions.DROP_BONUS'),
  UPGRADE_DUST_DISCOUNT: i18n.t(
    'skills:effectDescriptions.UPGRADE_DUST_DISCOUNT',
  ),
  GOLD_SHOP_DISCOUNT: i18n.t('skills:effectDescriptions.GOLD_SHOP_DISCOUNT'),
  DAILY_SHOP_LUCK: i18n.t('skills:effectDescriptions.DAILY_SHOP_LUCK'),
  EQUIP_UPGRADE_DISCOUNT: i18n.t(
    'skills:effectDescriptions.EQUIP_UPGRADE_DISCOUNT',
  ),
  SALVAGE_BONUS: i18n.t('skills:effectDescriptions.SALVAGE_BONUS'),
  TOKEN_OVERFLOW_DUST: i18n.t('skills:effectDescriptions.TOKEN_OVERFLOW_DUST'),
  ENERGY_PACK_CAP: i18n.t('skills:effectDescriptions.ENERGY_PACK_CAP'),
  WISHLIST_PULL_CHANCE: i18n.t(
    'skills:effectDescriptions.WISHLIST_PULL_CHANCE',
  ),
}

export const EFFECT_TYPES = Object.keys(EFFECT_DESCRIPTIONS)

export const EFFECT_OPTIONS = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

// Les clés `_one`/`_other` (voir skills.json) reproduisent EXACTEMENT le
// seuil `v > 1` du code d'origine : au singulier pour v <= 1 (donc aussi
// pour v = 0), pluriel au-delà — i18next choisit `_one` pour v = 0 ou 1 en
// français (catégorie CLDR "one" = i ∈ {0,1}) et seulement pour v = 1 en
// anglais, ce qui correspond à ce comportement dans les deux langues.
//
// Les quatre clés plurielles de ce bloc (TOKEN_VAULT, PITY_BOOST,
// WISHLIST_SLOTS, ENERGY_PACK_CAP) passent DEUX options pour une seule
// valeur, et c'est voulu : `count` choisit la forme grammaticale
// (`_one`/`_other`), `value` alimente le `{{value}}` du texte. `count` seul
// affichait « +{{value}} jetons » à l'écran — i18next n'interpole jamais
// `{{value}}` depuis `count`. Garde-fou : `check-i18n-keys.mjs` compare
// désormais les `{{var}}` de la valeur traduite aux clés de l'objet
// d'options du site d'appel.
export const EFFECT_FORMATTERS: Record<string, (v: number) => string> = {
  REGEN: (v) => i18n.t('skills:formatters.REGEN', { value: v }),
  LUCK: (v) =>
    i18n.t('skills:formatters.LUCK', {
      value: formatNumber(1 + v / 100, currentLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }),
  DUST_HARVEST: (v) => i18n.t('skills:formatters.DUST_HARVEST', { value: v }),
  TOKEN_VAULT: (v) =>
    i18n.t('skills:formatters.TOKEN_VAULT', { count: v, value: v }),
  FREE_PULL_CHANCE: (v) =>
    i18n.t('skills:formatters.FREE_PULL_CHANCE', { value: v }),
  MULTI_TOKEN_CHANCE: (v) =>
    i18n.t('skills:formatters.MULTI_TOKEN_CHANCE', { value: v }),
  GOLDEN_BALL_CHANCE: (v) =>
    i18n.t('skills:formatters.GOLDEN_BALL_CHANCE', { value: v }),
  SHOP_DISCOUNT: (v) => i18n.t('skills:formatters.SHOP_DISCOUNT', { value: v }),
  PULL_XP_BONUS: (v) => i18n.t('skills:formatters.PULL_XP_BONUS', { value: v }),
  PITY_BOOST: (v) =>
    i18n.t('skills:formatters.PITY_BOOST', { count: v, value: v }),
  VARIANT_LUCK: (v) => i18n.t('skills:formatters.VARIANT_LUCK', { value: v }),
  DAILY_SHOP_SLOT: (v) =>
    i18n.t('skills:formatters.DAILY_SHOP_SLOT', { value: v }),
  WISHLIST_SLOTS: (v) =>
    i18n.t('skills:formatters.WISHLIST_SLOTS', { count: v, value: v }),
  PC_VAULT: (v) => i18n.t('skills:formatters.PC_VAULT', { value: v }),
  PC_REGEN: (v) => i18n.t('skills:formatters.PC_REGEN', { value: v }),
  SWEEP_COST: (v) => i18n.t('skills:formatters.SWEEP_COST', { value: v }),
  GOLD_BONUS: (v) => i18n.t('skills:formatters.GOLD_BONUS', { value: v }),
  COMBAT_XP_BONUS: (v) =>
    i18n.t('skills:formatters.COMBAT_XP_BONUS', { value: v }),
  DROP_BONUS: (v) => i18n.t('skills:formatters.DROP_BONUS', { value: v }),
  UPGRADE_DUST_DISCOUNT: (v) =>
    i18n.t('skills:formatters.UPGRADE_DUST_DISCOUNT', { value: v }),
  GOLD_SHOP_DISCOUNT: (v) =>
    i18n.t('skills:formatters.GOLD_SHOP_DISCOUNT', { value: v }),
  DAILY_SHOP_LUCK: (v) =>
    i18n.t('skills:formatters.DAILY_SHOP_LUCK', { value: v }),
  EQUIP_UPGRADE_DISCOUNT: (v) =>
    i18n.t('skills:formatters.EQUIP_UPGRADE_DISCOUNT', { value: v }),
  SALVAGE_BONUS: (v) => i18n.t('skills:formatters.SALVAGE_BONUS', { value: v }),
  TOKEN_OVERFLOW_DUST: (v) =>
    i18n.t('skills:formatters.TOKEN_OVERFLOW_DUST', { value: v }),
  ENERGY_PACK_CAP: (v) =>
    i18n.t('skills:formatters.ENERGY_PACK_CAP', { count: v, value: v }),
  WISHLIST_PULL_CHANCE: (v) =>
    i18n.t('skills:formatters.WISHLIST_PULL_CHANCE', { value: v }),
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
