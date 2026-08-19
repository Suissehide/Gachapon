// Source of truth for per-route SEO metadata, lue par prerender-seo.mjs et par
// src/components/shared/SeoHead.tsx — d'où le .mjs, lisible sans transpilation.
//
// Une nouvelle route publique et indexable s'ajoute ici ET dans
// public/sitemap.xml. Pas de route derrière authentification.
//
// `path: '/'` est un cas spécial : il écrase dist/index.html sur place.

export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Gachapon — Attrape. Collectionne. Échange.',
    description:
      'Gachapon est un jeu de cartes à collectionner en ligne, gratuit et inspiré des capsules japonaises. Tire des capsules, découvre des cartes rares, échange avec ta communauté.',
    // Seule la home prérend un corps : les autres routes ont déjà du contenu
    // rendu suffisant. `heading` et `lead` recopient le hero de
    // src/routes/index.tsx (que son JSX éclate sur un <br> et un <span>) —
    // à garder synchronisés.
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
