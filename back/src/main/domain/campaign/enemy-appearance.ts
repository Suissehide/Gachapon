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
