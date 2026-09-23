import { Helmet } from 'react-helmet-async'

import { SEO_ROUTES } from '../../../scripts/seo-routes.mjs'
import { currentLocale } from '../../i18n/index.ts'

type SeoHeadProps = {
  /** Chemin tel que déclaré dans `scripts/seo-routes.mjs`, sans préfixe de langue. */
  path: string
}

/**
 * Applique le <title> de la route lors des navigations côté client.
 *
 * N'émet que le titre : description, canonical et og:* sont déjà dans le HTML
 * statique, et react-helmet-async ajoute ses balises au lieu de remplacer
 * celles d'index.html — les répéter ici donnait deux canonical contradictoires
 * par page, que Google résout en les ignorant tous les deux.
 *
 * La langue est lue à chaque rendu par `currentLocale()` (et non mémorisée) :
 * c'est la convention de src/i18n/index.ts. Un changement de langue provoque
 * de toute façon un rechargement complet (`useLocale.switchTo`), donc ce
 * composant ne voit jamais la locale changer sous lui.
 */
export function SeoHead({ path }: SeoHeadProps) {
  const route = SEO_ROUTES.find((r) => r.path === path)

  if (!route) {
    return null
  }

  return (
    <Helmet>
      <title>{route.title[currentLocale()]}</title>
    </Helmet>
  )
}
