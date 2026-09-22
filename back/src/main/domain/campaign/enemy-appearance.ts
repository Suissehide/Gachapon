import { getCurrentLocale } from '../../infra/i18n/locale-context'
import {
  ENEMY_FAMILIES,
  GENERIC_ENEMY_NAME_EN,
  GENERIC_ENEMY_NAME_FR,
} from '../content/enemies.definitions'

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

// Nom d'affichage d'un ennemi depuis son apparence "monsters/{slug}/{CODE}",
// dans la locale de la requête courante (voir `ENEMY_FAMILIES`).
// null si pas d'apparence ou slug inconnu (l'appelant met un nom générique,
// voir `genericEnemyName`).
export function enemyNameFromAppearance(
  appearance: string | null | undefined,
): string | null {
  if (!appearance) {
    return null
  }
  const slug = appearance.split('/')[1]
  const family = slug ? ENEMY_FAMILIES[slug] : undefined
  if (!family) {
    return null
  }
  return getCurrentLocale() === 'FR' ? family.nameFr : family.nameEn
}

/**
 * Repli générique d'un ennemi sans nom résoluble — "Ennemi 3" / "Enemy 3".
 * Source UNIQUE du gabarit : avant cette tâche, `sim-units.ts` et
 * `campaign.domain.ts` recopiaient chacun `Ennemi ${idx + 1}` en dur.
 */
export function genericEnemyName(index: number): string {
  const label =
    getCurrentLocale() === 'FR' ? GENERIC_ENEMY_NAME_FR : GENERIC_ENEMY_NAME_EN
  return `${label} ${index}`
}
