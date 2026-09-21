export type Locale = 'FR' | 'EN'

export const SUPPORTED_LOCALES: readonly Locale[] = ['FR', 'EN'] as const

/**
 * Langue servie quand rien ne permet de trancher. L'anglais et non le
 * français : le site vise d'abord un public international, le français est
 * une bascule explicite (voir la spec §2).
 */
export const DEFAULT_LOCALE: Locale = 'EN'

export function parseLocale(value: string | undefined): Locale | null {
  // Deuxième ligne de défense, pas une garde principale : la signature dit
  // `string | undefined`, donc c'est l'appelant qui est en faute s'il passe
  // autre chose (voir locale.plugin.ts pour la garde qui doit réellement
  // filtrer). Mais les types TS s'effacent à l'exécution — un paramètre de
  // querystring répété (`?lang=fr&lang=en`) arrive par exemple comme un
  // tableau — et cette fonction est exportée depuis `infra/i18n`, donc
  // appelable par du code futur qui n'aura pas forcément cette garde.
  // `typeof` coûte une comparaison et évite un crash sur `.trim()` pour
  // n'importe quelle entrée non-string, silencieusement traitée comme
  // absente plutôt que de lever.
  if (typeof value !== 'string' || !value) {
    return null
  }
  const upper = value.trim().toUpperCase()
  const base = upper.split('-')[0]
  return SUPPORTED_LOCALES.includes(base as Locale) ? (base as Locale) : null
}

/**
 * Négociation `Accept-Language` réduite à ce dont on a besoin : la locale
 * gérée dont le poids est le plus élevé. Un `q` absent vaut 1, un `q`
 * illisible vaut 1 aussi — un en-tête bancal ne doit pas coûter la langue.
 */
export function resolveLocaleFromHeader(header: string | undefined): Locale {
  if (!header) {
    return DEFAULT_LOCALE
  }

  let best: { locale: Locale; weight: number } | null = null

  for (const part of header.split(',')) {
    const [tag, ...params] = part.split(';')
    const locale = parseLocale(tag)
    if (!locale) {
      continue
    }

    const qParam = params.find((p) => p.trim().startsWith('q='))
    const parsed = qParam ? Number(qParam.trim().slice(2)) : Number.NaN
    const weight = Number.isFinite(parsed) ? parsed : 1

    if (weight > 0 && (best === null || weight > best.weight)) {
      best = { locale, weight }
    }
  }

  return best?.locale ?? DEFAULT_LOCALE
}
