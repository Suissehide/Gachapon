import { Helmet } from 'react-helmet-async'

import { SEO_ROUTES } from '../../../scripts/seo-routes.mjs'

type SeoHeadProps = {
  /** Route path as declared in `scripts/seo-routes.mjs`. */
  path: string
}

/**
 * Applies the route's <title> on client-side navigation.
 *
 * It deliberately renders *only* the title. description, canonical and og:*
 * are baked into the static HTML by `scripts/prerender-seo.mjs`, and
 * react-helmet-async appends its tags rather than replacing the ones already
 * present in index.html — so repeating them here produced two conflicting
 * <link rel="canonical"> per page, which Google resolves by ignoring both.
 *
 * Crawlers always fetch a fresh document per URL, so the static tags are the
 * ones that matter for indexing; this component only keeps the browser tab
 * correct when the router swaps pages without a new document.
 */
export function SeoHead({ path }: SeoHeadProps) {
  const route = SEO_ROUTES.find((r) => r.path === path)

  if (!route) {
    return null
  }

  return (
    <Helmet>
      <title>{route.title}</title>
    </Helmet>
  )
}
