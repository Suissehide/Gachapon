// Source of truth for per-route SEO metadata, lue par prerender-seo.mjs et par
// src/components/shared/SeoHead.tsx — d'où le .mjs, lisible sans transpilation.
//
// Une nouvelle route publique et indexable s'ajoute ici, et nulle part
// ailleurs : prerender-seo.mjs en dérive aussi dist/sitemap.xml et les liens
// internes du bloc statique. Pas de route derrière authentification.
//
// `path: '/'` est un cas spécial : il écrase dist/index.html sur place.
//
// `staticBlock` est le corps lisible sans exécuter le JS. Il doit reprendre le
// contenu réel de `src/routes/<route>.tsx` — si le HTML statique et la page
// rendue divergent, Google compare deux pages pour une même URL. `nav: false`
// le prive des liens internes ; par défaut ils y sont.
//
// `navLabel` est le texte d'ancre des liens internes du bloc statique : c'est
// le seul signal de maillage que Googlebot reçoit sans exécuter le JS.
//
// `sitemap.changefreq` / `sitemap.priority` alimentent dist/sitemap.xml.

export const SEO_ROUTES = [
  {
    path: '/',
    navLabel: 'Accueil',
    title: 'Gachapon — Attrape. Collectionne. Échange.',
    description:
      'Gachapon est un jeu de cartes à collectionner en ligne, gratuit et inspiré des capsules japonaises. Tire des capsules, découvre des cartes rares, échange avec ta communauté.',
    sitemap: { changefreq: 'weekly', priority: '1.0' },
    // `heading` et `lead` recopient le hero de src/routes/index.tsx (que son
    // JSX éclate sur un <br> et un <span>) — à garder synchronisés.
    staticBlock: {
      heading: 'Une nouvelle manière de collectionner.',
      lead: 'Gachapon transforme le plaisir de collection en une expérience élégante, immersive et profondément sociale. Chaque tirage, mémorable.',
      faq: true,
    },
  },
  {
    path: '/about',
    navLabel: 'À propos',
    title: 'À propos — Gachapon',
    description:
      'Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises. Tirages, raretés, campagne & combats, compétences, équipes et API publique.',
    sitemap: { changefreq: 'monthly', priority: '0.7' },
    staticBlock: {
      heading: 'À propos',
      lead: 'Gachapon est un jeu de cartes à collectionner en ligne, inspiré des distributeurs automatiques de capsules japonaises.',
      sections: [
        {
          h: "L'idée",
          p: "L'idée est simple : chaque capsule que tu ouvres peut contenir une carte commune ou un trésor légendaire. Mais Gachapon ne s'arrête pas à la collection — tu fais aussi combattre tes cartes dans une campagne. La chance ouvre les capsules, la stratégie fait le reste : compétences, montée en puissance des cartes et composition d'équipe font toute la différence.",
        },
        {
          h: 'Fonctionnalités',
          items: [
            'Tirage de capsules avec système de rareté (Common → Legendary) et variantes Brillantes & Holographiques',
            'Campagne et combats au tour par tour avec ton équipe de cartes',
            'Amélioration des cartes : niveau, ascension par palier et équipement',
            'Arbre de compétences pour des bonus passifs permanents',
            'Quêtes, succès, chaîne de connexion et récompenses à récupérer',
            'Boutique du jour et Vœu pour cibler les cartes qui te manquent',
            'Classements collectionneurs, équipes et combats',
            'Équipes pour jouer avec tes amis',
            'API publique pour créer ton propre bot Discord',
          ],
        },
        {
          h: 'Communauté',
          p: 'Rejoins le serveur Discord pour suivre les mises à jour, partager tes pulls et rencontrer d’autres collectionneurs.',
        },
      ],
    },
  },
  {
    path: '/guide',
    navLabel: 'Guide du joueur',
    title: 'Guide du joueur — Gachapon',
    description:
      "Tout ce qu'il faut savoir sur Gachapon : jetons, tirages, raretés, pitié, poussière, boutique du jour, arbre de compétences, campagne & combats, amélioration des cartes, quêtes, succès, classements et API publique.",
    sitemap: { changefreq: 'monthly', priority: '0.8' },
    staticBlock: {
      heading: 'Guide du joueur',
      lead: "Gachapon mêle deux boucles de jeu : collectionner des cartes en tirant des capsules, et les faire combattre dans la campagne pour progresser. Voici tout ce qu'il faut savoir pour débuter et optimiser.",
      sections: [
        {
          h: 'Sommaire',
          // Reprend SECTIONS dans src/routes/guide.tsx.
          items: [
            'Les monnaies',
            'Jetons & régénération',
            'Tirer une capsule',
            'Raretés & variantes',
            'Système de pitié',
            'Doublons & poussière',
            'Boutique du jour & Vœu',
            'Niveaux & XP',
            'Arbre de compétences',
            'Campagne & combats',
            'Points de combat',
            'Améliorer ses cartes',
            'Quêtes',
            'Succès',
            'Chaîne de connexion',
            'Récompenses',
            'Classements',
            'Collection',
            'Équipes',
            'API & Discord',
          ],
        },
      ],
    },
  },
  {
    path: '/changelog',
    navLabel: 'Changelog',
    title: 'Changelog — Gachapon',
    description:
      'Historique des mises à jour, nouvelles fonctionnalités et améliorations apportées à Gachapon.',
    sitemap: { changefreq: 'monthly', priority: '0.5' },
    // Pas de `sections` : la liste des versions vit dans src/routes/changelog.tsx
    // et est réécrite par la commande `changelog`. La recopier ici la ferait
    // diverger au premier passage.
    staticBlock: {
      heading: 'Changelog',
      lead: 'Tout ce qui a changé dans Gachapon, de la première capsule aux dernières nouveautés.',
    },
  },
  {
    path: '/stats',
    navLabel: 'Statistiques',
    title: 'Statistiques — Gachapon',
    description:
      'Les chiffres de Gachapon en temps réel : joueurs inscrits, capsules ouvertes, cartes disponibles et légendaires obtenues.',
    sitemap: { changefreq: 'weekly', priority: '0.6' },
    staticBlock: {
      heading: 'En chiffres',
      lead: 'Des milliers de joueurs, des millions de capsules, des cartes légendaires qui changent de mains chaque jour.',
      sections: [
        {
          h: 'Les compteurs suivis',
          // Les valeurs viennent de l'API : seuls les intitulés sont statiques.
          items: [
            'Joueurs inscrits',
            'Capsules ouvertes',
            'Joueurs actifs cette semaine',
            'Cartes disponibles',
            'Cartes légendaires obtenues',
            "Capsules ouvertes aujourd'hui",
            'Poussière totale accumulée',
            'Sets disponibles',
            'Cartes légendaires existantes',
          ],
        },
      ],
    },
  },
  {
    path: '/discord',
    navLabel: 'Bot Discord',
    title: 'Bot Discord — Gachapon',
    description:
      "Connecte ton serveur Discord à Gachapon via l'API publique. Tire des capsules, consulte ta collection et suis le classement sans quitter Discord.",
    sitemap: { changefreq: 'monthly', priority: '0.6' },
    staticBlock: {
      heading: 'Bot Discord',
      lead: "Connecte ton serveur Discord à Gachapon via l'API publique. Tes membres pourront tirer des capsules, consulter leur collection et suivre le classement — sans quitter Discord.",
      sections: [
        {
          h: 'Les étapes',
          // Reprend les <Step> de src/routes/discord.tsx.
          items: [
            "Créer l'application Discord",
            'Générer ta clé API Gachapon',
            'Initialiser le projet',
            'Enregistrer les commandes slash',
            'Commande /pull',
            'Commandes /collection et /classement',
            'Assembler le bot',
            'Aller plus loin',
          ],
        },
      ],
    },
  },
  {
    path: '/api-docs',
    navLabel: 'API publique',
    title: 'API publique — Gachapon',
    description:
      "Documentation de l'API publique de Gachapon : référence des endpoints, authentification par clé d'API et intégration dans vos propres outils et bots Discord.",
    sitemap: { changefreq: 'monthly', priority: '0.5' },
    // La page n'est qu'un embed Scalar, rendu entièrement côté client : sans ce
    // bloc, Googlebot ne voit strictement rien sur cette URL.
    staticBlock: {
      heading: 'API publique',
      lead: "La référence des endpoints de Gachapon, générée depuis le schéma OpenAPI du serveur. L'authentification se fait par clé d'API, à passer dans l'en-tête X-API-Key.",
      sections: [
        {
          h: 'À quoi elle sert',
          p: "Elle permet de brancher tes propres outils sur ton compte : tirer des capsules, lire ta collection et consulter les classements depuis l'extérieur du site. Le guide d'intégration pas à pas vit sur la page Bot Discord.",
        },
      ],
    },
  },
]

export const SITE_ORIGIN = 'https://gachapon.qwetle.fr'
