/**
 * Précharge une image dans le cache du navigateur pour que le rendu ultérieur
 * d'un `<img>` pointant sur la même URL soit instantané (octets déjà en cache,
 * plus de fetch réseau). Poser `src` sur un `Image` suffit à déclencher le
 * chargement, même sans insertion dans le DOM.
 */
export function preloadImage(url: string | null | undefined): void {
  if (!url) {
    return
  }
  new Image().src = url
}

/** Précharge une liste d'URLs (les valeurs nulles/vides sont ignorées). */
export function preloadImages(urls: (string | null | undefined)[]): void {
  for (const url of urls) {
    preloadImage(url)
  }
}
