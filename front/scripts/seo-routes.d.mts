// Types de seo-routes.mjs, pour que src/ importe la table du script de build
// au lieu d'en garder une seconde copie.

/** Doit rester égal à `Locale` de src/i18n/index.ts. */
export type SeoLocale = 'fr' | 'en'

/**
 * Champ textuel bilingue. Les deux langues sont OBLIGATOIRES : un champ
 * optionnel laisserait passer une page à moitié traduite jusqu'en production
 * (voir `assertLocalized()` dans prerender-seo.mjs, qui le vérifie aussi au
 * build, TypeScript ne voyant pas le contenu du .mjs).
 */
export type Localized = Record<SeoLocale, string>

export type SeoSection = {
  h: Localized
  /** Liste à puces. Exclusif avec `p`. */
  items?: Localized[]
  /** Paragraphe. Exclusif avec `items`. */
  p?: Localized
}

export type SeoRoute = {
  /** Chemin SANS préfixe de langue — voir src/main.tsx (`basepath`). */
  path: string
  /** Texte d'ancre des liens internes du bloc statique. */
  navLabel: Localized
  title: Localized
  description: Localized
  sitemap: { changefreq: string; priority: string }
  /** Présent = la route prérend un corps lisible sans JS. */
  staticBlock?: {
    heading: Localized
    lead: Localized
    sections?: SeoSection[]
    /** Ajoute FAQ_ITEMS en paires <h2>/<p>. */
    faq?: boolean
    /** `false` prive le bloc des liens internes. */
    nav?: boolean
  }
}

export type SiteMeta = {
  htmlLang: string
  ogLocale: string
  inLanguage: string
  siteDescription: string
  genre: string[]
  ogImageAlt: string
  /** aria-label du <nav> des liens internes du bloc statique. */
  navAriaLabel: string
}

export declare const SEO_ROUTES: SeoRoute[]
export declare const SITE_META: Record<SeoLocale, SiteMeta>
export declare const SEO_LOCALES: SeoLocale[]
export declare const DEFAULT_SEO_LOCALE: SeoLocale
export declare const LEGACY_LOCALE: SeoLocale
export declare const SITE_ORIGIN: string
