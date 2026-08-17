// Types for seo-routes.mjs, so `src/` can import the same table the build
// script uses instead of keeping a second, drift-prone copy of every string.

export type SeoRoute = {
  /** Route path, leading slash, no trailing slash (except the root `/`). */
  path: string
  title: string
  description: string
}

export declare const SEO_ROUTES: SeoRoute[]
export declare const SITE_ORIGIN: string
