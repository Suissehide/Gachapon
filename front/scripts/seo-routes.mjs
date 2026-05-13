// Source of truth for per-route SEO metadata.
// Used by scripts/prerender-seo.mjs at build time to generate one
// `<route>/index.html` per public route, with the proper meta tags
// already in the HTML *before* the React app boots.
//
// Add a new entry here whenever you create a new public, indexable route.
// Don't add auth-walled routes (they'd be empty/duplicate to Googlebot).
//
// `path: '/'` is special-cased — it overwrites the root index.html in place.

export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Gachapon — Attrape. Collectionne. Échange.',
    description:
      "Gachapon est un jeu de cartes à collectionner en ligne, gratuit et inspiré des capsules japonaises. Tire des capsules, découvre des cartes rares, échange avec ta communauté.",
  },
  {
    path: '/about',
    title: 'À propos — Gachapon',
    description:
      "Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises. Tirages, rareté, équipes et API publique.",
  },
  {
    path: '/guide',
    title: 'Guide du joueur — Gachapon',
    description:
      "Tout ce qu'il faut savoir pour débuter sur Gachapon : jetons, tirages, raretés, variantes, système de pitié, améliorations, équipes et API publique.",
  },
  {
    path: '/changelog',
    title: 'Changelog — Gachapon',
    description:
      "Historique des mises à jour, nouvelles fonctionnalités et améliorations apportées à Gachapon.",
  },
]

export const SITE_ORIGIN = 'https://gachapon.qwetle.fr'
