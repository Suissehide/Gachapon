// Source of truth for per-route SEO metadata.
//
// Consumed by TWO sides, which is why it lives in plain .mjs (readable by node
// without a transpile step, bundlable by Vite):
//   1. scripts/prerender-seo.mjs — bakes title/description/canonical/og into
//      `dist/<route>/index.html` at build time, for crawlers that don't run JS.
//   2. src/components/shared/SeoHead.tsx — re-applies the <title> during
//      client-side navigation, where no new HTML document is fetched.
//
// Add a new entry here whenever you create a new public, indexable route, and
// add the matching <url> to public/sitemap.xml.
// Don't add auth-walled routes (they'd be empty/duplicate to Googlebot).
//
// `path: '/'` is special-cased — it overwrites the root index.html in place.

export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Gachapon — Attrape. Collectionne. Échange.',
    description:
      'Gachapon est un jeu de cartes à collectionner en ligne, gratuit et inspiré des capsules japonaises. Tire des capsules, découvre des cartes rares, échange avec ta communauté.',
    // Only the landing page gets a body pre-rendered: it's the one route whose
    // rendered content is thin (~600 words vs 2000+ for /guide), and the one
    // Google reports as "Explorée, actuellement non indexée".
    //
    // `heading` and `lead` mirror the hero in src/routes/index.tsx. They're
    // duplicated on purpose — the JSX splits the heading across a <br> and a
    // gradient <span>, which can't be expressed as a plain string. Keep in sync.
    staticBlock: {
      heading: 'Une nouvelle manière de collectionner.',
      lead: 'Gachapon transforme le plaisir de collection en une expérience élégante, immersive et profondément sociale. Chaque tirage, mémorable.',
      faq: true,
    },
  },
  {
    path: '/about',
    title: 'À propos — Gachapon',
    description:
      'Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises. Tirages, raretés, campagne & combats, compétences, équipes et API publique.',
  },
  {
    path: '/guide',
    title: 'Guide du joueur — Gachapon',
    description:
      "Tout ce qu'il faut savoir sur Gachapon : jetons, tirages, raretés, pitié, poussière, boutique du jour, arbre de compétences, campagne & combats, amélioration des cartes, quêtes, succès, classements et API publique.",
  },
  {
    path: '/changelog',
    title: 'Changelog — Gachapon',
    description:
      'Historique des mises à jour, nouvelles fonctionnalités et améliorations apportées à Gachapon.',
  },
  {
    path: '/stats',
    title: 'Statistiques — Gachapon',
    description:
      'Les chiffres de Gachapon en temps réel : joueurs inscrits, capsules ouvertes, cartes disponibles et légendaires obtenues.',
  },
  {
    path: '/discord',
    title: 'Bot Discord — Gachapon',
    description:
      "Connecte ton serveur Discord à Gachapon via l'API publique. Tire des capsules, consulte ta collection et suis le classement sans quitter Discord.",
  },
  {
    path: '/api-docs',
    title: 'API publique — Gachapon',
    description:
      "Documentation de l'API publique de Gachapon : référence des endpoints, authentification par clé d'API et intégration dans vos propres outils et bots Discord.",
  },
]

export const SITE_ORIGIN = 'https://gachapon.qwetle.fr'
