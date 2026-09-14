// ── Card art sources ───────────────────────────────────────────────────────────
// Les masters sont des PNG ~2,5 Mo dans MinIO (`cards/<slug>/XXX-001.png`). À
// côté de chaque master vivent des variantes WebP générées par
// `back/scripts/cards-webp.py` : `XXX-001-320.webp`, `-640.webp`, `-1248.webp`.
// On dérive ces URLs depuis `imageUrl` (qui reste l'URL du PNG en base) pour
// ne rien changer au seed ni au schéma. Si une variante manque, `<img>` retombe
// sur le PNG via `onError` (voir TcgCardFace).

const CARD_IMAGE_WIDTHS = [320, 640, 1248] as const

export type CardImageSources = {
  /** URL par défaut (variante 640 px, ou le PNG si l'URL n'est pas un PNG). */
  src: string
  /** Attribut `srcset` complet, ou `undefined` si aucune variante n'existe. */
  srcSet: string | undefined
  /** URL du master PNG, utilisée comme secours si une variante 404. */
  fallback: string
}

const PNG_SUFFIX = /\.png$/i

function cardImageSources(imageUrl: string): CardImageSources {
  if (!PNG_SUFFIX.test(imageUrl)) {
    return { src: imageUrl, srcSet: undefined, fallback: imageUrl }
  }
  const base = imageUrl.replace(PNG_SUFFIX, '')
  return {
    src: `${base}-640.webp`,
    srcSet: CARD_IMAGE_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', '),
    fallback: imageUrl,
  }
}

/**
 * Cascade de secours d'un `<img>` de carte, jouée sur `onError` : variante WebP
 * → PNG master → PNG master avec cache-buster → abandon (`onGiveUp`). L'étape
 * courante vit dans `data-step` plutôt que dans un state React : un rendu ne
 * doit pas rejouer la cascade, et il y a une image par carte dans la grille.
 */
export function handleCardImageError(
  img: HTMLImageElement,
  sources: CardImageSources,
  onGiveUp: () => void,
): void {
  const step = Number(img.dataset.step ?? '0')
  if (step === 0 && sources.srcSet) {
    // Variante WebP absente (carte uploadée sans passer par cards-webp.py,
    // par ex.) : on retombe sur le PNG master.
    img.dataset.step = '1'
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
    img.src = sources.fallback
    return
  }
  if (step <= 1) {
    // Un essai de plus (cache-busté, petit délai) avant d'abandonner : une
    // défaillance passagère sous charge ne doit pas vider la carte pour de bon.
    img.dataset.step = '2'
    const sep = sources.fallback.includes('?') ? '&' : '?'
    setTimeout(() => {
      img.src = `${sources.fallback}${sep}retry=1`
    }, 600)
    return
  }
  onGiveUp()
}

/** Largeur d'affichage de la carte, pour l'attribut `sizes` du `<img>`. */
export type CardImageSize = 'compact' | 'default' | 'large'

// Cf. `sizeClass` dans CardDisplay : w-60 = 240 px, w-80 = 320 px, compact =
// pleine largeur de sa cellule (grille 2 colonnes sur mobile, ~220 px ailleurs).
const CARD_IMAGE_SIZES: Record<CardImageSize, string> = {
  compact: '(max-width: 640px) 45vw, 220px',
  default: '240px',
  large: '320px',
}

/** Traduit les drapeaux de taille de `CardDisplay` en `CardImageSize`. */
export function cardImageSizeOf(
  compact: boolean,
  large: boolean,
): CardImageSize {
  if (compact) {
    return 'compact'
  }
  return large ? 'large' : 'default'
}

/** Attributs `<img>` prêts à étaler, plus les sources pour `onError`. */
export type CardImageRender = {
  imgProps: { src: string; srcSet?: string; sizes?: string }
  sources: CardImageSources | null
}

export function cardImage(
  imageUrl: string | null | undefined,
  imageSize: CardImageSize | undefined,
  compact: boolean,
  placeholder: string,
): CardImageRender {
  if (!imageUrl) {
    return { imgProps: { src: placeholder }, sources: null }
  }
  const sources = cardImageSources(imageUrl)
  if (!sources.srcSet) {
    return { imgProps: { src: sources.src }, sources }
  }
  const size = imageSize ?? (compact ? 'compact' : 'default')
  return {
    imgProps: {
      src: sources.src,
      srcSet: sources.srcSet,
      sizes: CARD_IMAGE_SIZES[size],
    },
    sources,
  }
}
