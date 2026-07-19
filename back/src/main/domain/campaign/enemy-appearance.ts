// Enemy images live alongside cards in MinIO, under the same env-based prefix as
// the card import (import-cards.mjs): dev => `staging/cards/…`, prod => `cards/…`.
// `appearance` holds the sub-path after `cards/`, without the .png extension,
// e.g. "monsters/slimes/SLIME-001". `keyPrefix` is the env prefix ('staging/' in
// dev, '' in prod). The image is purely cosmetic.
export function resolveEnemyImageUrl(
  appearance: string | null | undefined,
  publicUrl: (key: string) => string,
  keyPrefix = '',
): string | null {
  if (!appearance) {
    return null
  }
  return publicUrl(`${keyPrefix}cards/${appearance}.png`)
}

// Nom d'affichage FR par famille (slug MinIO -> libellé singulier).
const FAMILY_LABELS: Record<string, string> = {
  slimes: 'Slime',
  mushrooms: 'Champignon',
  kobolds: 'Kobold',
  wisps: 'Feu follet',
  gnolls: 'Gnoll',
  wolves: 'Loup',
  mimics: 'Mimic',
  specters: 'Spectre',
  elementals: 'Élémentaire',
  minotaurs: 'Minotaure',
  basilisks: 'Basilic',
  hydras: 'Hydre',
  krakens: 'Kraken',
  wyverns: 'Wyverne',
  bosses: 'Boss',
}

// Nom d'affichage d'un ennemi depuis son apparence "monsters/{slug}/{CODE}".
// null si pas d'apparence ou slug inconnu (l'appelant met un nom générique).
export function enemyNameFromAppearance(
  appearance: string | null | undefined,
): string | null {
  if (!appearance) {
    return null
  }
  const slug = appearance.split('/')[1]
  return (slug && FAMILY_LABELS[slug]) || null
}
