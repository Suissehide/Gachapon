// Enemy images live under the shared cards/ prefix in MinIO:
//   cards/monsters/{family}/{CODE}.png   (bosses: cards/monsters/boss/BOSS-001.png)
// `appearance` holds the sub-path without the cards/ prefix nor the .png extension,
// e.g. "monsters/slime/SLI-001". The image is purely cosmetic.
export function resolveEnemyImageUrl(
  appearance: string | null | undefined,
  publicUrl: (key: string) => string,
): string | null {
  if (!appearance) {
    return null
  }
  return publicUrl(`cards/${appearance}.png`)
}
