// Types de seo-routes.mjs, pour que src/ importe la table du script de build
// au lieu d'en garder une seconde copie.

export type SeoRoute = {
  path: string
  title: string
  description: string
  /** Présent = la route prérend un corps lisible sans JS. */
  staticBlock?: {
    heading: string
    lead: string
    /** Ajoute FAQ_ITEMS en paires <h2>/<p>. */
    faq?: boolean
  }
}

export declare const SEO_ROUTES: SeoRoute[]
export declare const SITE_ORIGIN: string
