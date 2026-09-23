// Source of truth for per-route SEO metadata, lue par prerender-seo.mjs et par
// src/components/shared/SeoHead.tsx — d'où le .mjs, lisible sans transpilation.
//
// Une nouvelle route publique et indexable s'ajoute ici, et nulle part
// ailleurs : prerender-seo.mjs en dérive aussi dist/sitemap.xml, les liens
// internes du bloc statique et les 301 des anciennes URLs (voir
// `nginx-seo.conf`). Pas de route derrière authentification.
//
// BILINGUE (lot 3). Chaque champ textuel est un objet `{ fr, en }` plutôt
// qu'une seconde table `SEO_ROUTES_EN` parallèle. Deux raisons :
//   - ce qui n'est pas du texte (`path`, `sitemap`, `faq`, `nav`) ne s'écrit
//     qu'une fois, donc ne peut pas diverger entre les langues ;
//   - les tableaux (`items`) sont des tableaux d'objets `{ fr, en }` et non
//     deux tableaux de chaînes : une liste ne peut pas structurellement avoir
//     20 entrées en français et 19 en anglais.
// `assertLocalized()` dans prerender-seo.mjs fait échouer le build si une des
// deux langues manque — le garde-fou que cette forme ne peut pas offrir seule.
//
// `path` n'a PAS de préfixe de langue : c'est le chemin sous le `basepath` du
// routeur (voir src/main.tsx). prerender-seo.mjs pose `/fr` ou `/en` devant.
//
// `staticBlock` est le corps lisible sans exécuter le JS. Il doit reprendre le
// contenu réel de `src/routes/<route>.tsx` — si le HTML statique et la page
// rendue divergent, Google compare deux pages pour une même URL. Depuis le
// lot 2 ce contenu vit dans `src/i18n/locales/{fr,en}/*.json` : c'est de là
// que les deux langues sont recopiées, pas d'une traduction refaite ici.
// `nav: false` prive le bloc des liens internes ; par défaut ils y sont.
//
// `navLabel` est le texte d'ancre des liens internes du bloc statique : c'est
// le seul signal de maillage que Googlebot reçoit sans exécuter le JS.
//
// `sitemap.changefreq` / `sitemap.priority` alimentent dist/sitemap.xml.

export const SEO_ROUTES = [
  {
    path: '/',
    navLabel: { fr: 'Accueil', en: 'Home' },
    title: {
      fr: 'Gachapon — Attrape. Collectionne. Échange.',
      en: 'Gachapon — Catch. Collect. Trade.',
    },
    description: {
      fr: 'Gachapon est un jeu de cartes à collectionner en ligne, gratuit et inspiré des capsules japonaises. Tire des capsules, découvre des cartes rares, échange avec ta communauté.',
      en: 'Gachapon is a free online trading card game inspired by Japanese capsule machines. Pull capsules, discover rare cards, and trade with your community.',
    },
    sitemap: { changefreq: 'weekly', priority: '1.0' },
    // `heading` et `lead` recopient le hero de src/routes/index.tsx (que son
    // JSX éclate sur un <br> et un <span>) — à garder synchronisés.
    // `heading` = home:hero.titleLine1 + titleLine2, `lead` = hero.subtitle.
    staticBlock: {
      heading: {
        fr: 'Une nouvelle manière de collectionner.',
        en: 'A new way to collect.',
      },
      lead: {
        fr: 'Gachapon transforme le plaisir de collection en une expérience élégante, immersive et profondément sociale. Chaque tirage, mémorable.',
        en: 'Gachapon turns the joy of collecting into an elegant, immersive, and deeply social experience. Every pull, memorable.',
      },
      faq: true,
    },
  },
  {
    path: '/about',
    navLabel: { fr: 'À propos', en: 'About' },
    title: { fr: 'À propos — Gachapon', en: 'About — Gachapon' },
    description: {
      fr: 'Découvrez Gachapon, un jeu de cartes à collectionner en ligne inspiré des distributeurs automatiques de capsules japonaises. Tirages, raretés, campagne & combats, compétences, équipes et API publique.',
      en: 'Discover Gachapon, an online trading card game inspired by Japanese capsule vending machines. Pulls, rarities, campaign & battles, skills, teams, and a public API.',
    },
    sitemap: { changefreq: 'monthly', priority: '0.7' },
    staticBlock: {
      heading: { fr: 'À propos', en: 'About' },
      lead: {
        fr: 'Gachapon est un jeu de cartes à collectionner en ligne, inspiré des distributeurs automatiques de capsules japonaises.',
        en: 'Gachapon is an online trading card game, inspired by Japanese capsule vending machines.',
      },
      sections: [
        {
          h: { fr: "L'idée", en: 'The idea' },
          p: {
            fr: "L'idée est simple : chaque capsule que tu ouvres peut contenir une carte commune ou un trésor légendaire. Mais Gachapon ne s'arrête pas à la collection — tu fais aussi combattre tes cartes dans une campagne. La chance ouvre les capsules, la stratégie fait le reste : compétences, montée en puissance des cartes et composition d'équipe font toute la différence.",
            en: "The idea is simple: every capsule you open can contain a common card or a legendary treasure. But Gachapon doesn't stop at collecting — you also battle with your cards in a campaign. Luck opens the capsules, strategy does the rest: skills, card power progression, and team composition make all the difference.",
          },
        },
        {
          h: { fr: 'Fonctionnalités', en: 'Features' },
          items: [
            {
              fr: 'Tirage de capsules avec système de rareté (Common → Legendary) et variantes Brillantes & Holographiques',
              en: 'Capsule pulls with a rarity system (Common → Legendary) and Brilliant & Holographic variants',
            },
            {
              fr: 'Campagne et combats au tour par tour avec ton équipe de cartes',
              en: 'Turn-based campaign and battles with your card team',
            },
            {
              fr: 'Amélioration des cartes : niveau, ascension par palier et équipement',
              en: 'Card progression: leveling, tiered ascension, and equipment',
            },
            {
              fr: 'Arbre de compétences pour des bonus passifs permanents',
              en: 'A skill tree for permanent passive bonuses',
            },
            {
              fr: 'Quêtes, succès, chaîne de connexion et récompenses à récupérer',
              en: 'Quests, achievements, a login streak, and rewards to claim',
            },
            {
              fr: 'Boutique du jour et Vœu pour cibler les cartes qui te manquent',
              en: "Daily shop and Wish to target the cards you're missing",
            },
            {
              fr: 'Classements collectionneurs, équipes et combats',
              en: 'Collector, team, and battle leaderboards',
            },
            {
              fr: 'Équipes pour jouer avec tes amis',
              en: 'Teams to play with your friends',
            },
            {
              fr: 'API publique pour créer ton propre bot Discord',
              en: 'A public API to build your own Discord bot',
            },
          ],
        },
        {
          h: { fr: 'Communauté', en: 'Community' },
          p: {
            fr: 'Rejoins le serveur Discord pour suivre les mises à jour, partager tes pulls et rencontrer d’autres collectionneurs.',
            en: 'Join the Discord server to follow updates, share your pulls, and meet other collectors.',
          },
        },
      ],
    },
  },
  {
    path: '/guide',
    navLabel: { fr: 'Guide du joueur', en: 'Player guide' },
    title: { fr: 'Guide du joueur — Gachapon', en: 'Player guide — Gachapon' },
    description: {
      fr: "Tout ce qu'il faut savoir sur Gachapon : jetons, tirages, raretés, pitié, poussière, boutique du jour, arbre de compétences, campagne & combats, amélioration des cartes, quêtes, succès, classements et API publique.",
      en: 'Everything you need to know about Gachapon: tokens, pulls, rarities, pity, dust, the daily shop, the skill tree, campaign & battles, card upgrades, quests, achievements, leaderboards, and the public API.',
    },
    sitemap: { changefreq: 'monthly', priority: '0.8' },
    staticBlock: {
      heading: { fr: 'Guide du joueur', en: 'Player guide' },
      lead: {
        fr: "Gachapon mêle deux boucles de jeu : collectionner des cartes en tirant des capsules, et les faire combattre dans la campagne pour progresser. Voici tout ce qu'il faut savoir pour débuter et optimiser.",
        en: "Gachapon blends two game loops: collecting cards by pulling capsules, and battling with them in the campaign to progress. Here's everything you need to get started and play smart.",
      },
      sections: [
        {
          h: { fr: 'Sommaire', en: 'Contents' },
          // Reprend SECTION_IDS dans src/routes/guide.tsx, dans l'ordre, et
          // les libellés de guide:sectionLabels.<id> des deux locales.
          items: [
            { fr: 'Les monnaies', en: 'Currencies' },
            { fr: 'Jetons & régénération', en: 'Tokens & regen' },
            { fr: 'Tirer une capsule', en: 'Pulling a capsule' },
            { fr: 'Raretés & variantes', en: 'Rarities & variants' },
            { fr: 'Système de pitié', en: 'Pity system' },
            { fr: 'Doublons & poussière', en: 'Duplicates & dust' },
            { fr: 'Boutique du jour & Vœu', en: 'Daily shop & Wishes' },
            { fr: 'Niveaux & XP', en: 'Levels & XP' },
            { fr: 'Arbre de compétences', en: 'Skill tree' },
            { fr: 'Campagne & combats', en: 'Campaign & battles' },
            { fr: 'Points de combat', en: 'Combat points' },
            { fr: 'Améliorer ses cartes', en: 'Upgrading your cards' },
            { fr: 'Quêtes', en: 'Quests' },
            { fr: 'Succès', en: 'Achievements' },
            { fr: 'Chaîne de connexion', en: 'Login streak' },
            { fr: 'Récompenses', en: 'Rewards' },
            { fr: 'Classements', en: 'Leaderboards' },
            { fr: 'Collection', en: 'Collection' },
            { fr: 'Équipes', en: 'Teams' },
            { fr: 'API & Discord', en: 'API & Discord' },
          ],
        },
      ],
    },
  },
  {
    path: '/changelog',
    navLabel: { fr: 'Changelog', en: 'Changelog' },
    title: { fr: 'Changelog — Gachapon', en: 'Changelog — Gachapon' },
    description: {
      fr: 'Historique des mises à jour, nouvelles fonctionnalités et améliorations apportées à Gachapon.',
      en: 'A history of the updates, new features, and improvements shipped to Gachapon.',
    },
    sitemap: { changefreq: 'monthly', priority: '0.5' },
    // Pas de `sections` : la liste des versions vit dans src/routes/changelog.tsx
    // et est réécrite par la commande `changelog`. La recopier ici la ferait
    // diverger au premier passage.
    staticBlock: {
      heading: { fr: 'Changelog', en: 'Changelog' },
      lead: {
        fr: 'Tout ce qui a changé dans Gachapon, de la première capsule aux dernières nouveautés.',
        en: "Everything that's changed in Gachapon, from the very first capsule to the latest news.",
      },
    },
  },
  {
    path: '/stats',
    navLabel: { fr: 'Statistiques', en: 'Statistics' },
    title: { fr: 'Statistiques — Gachapon', en: 'Statistics — Gachapon' },
    description: {
      fr: 'Les chiffres de Gachapon en temps réel : joueurs inscrits, capsules ouvertes, cartes disponibles et légendaires obtenues.',
      en: "Gachapon's numbers in real time: registered players, capsules opened, available cards, and legendary cards pulled.",
    },
    sitemap: { changefreq: 'weekly', priority: '0.6' },
    staticBlock: {
      heading: { fr: 'En chiffres', en: 'By the numbers' },
      lead: {
        fr: 'Des milliers de joueurs, des millions de capsules, des cartes légendaires qui changent de mains chaque jour.',
        en: 'Thousands of players, millions of capsules, legendary cards changing hands every day.',
      },
      sections: [
        {
          h: {
            fr: 'Les compteurs suivis',
            en: 'The counters we track',
          },
          // Les valeurs viennent de l'API : seuls les intitulés sont statiques.
          // Reprend stats:page.cards des deux locales.
          items: [
            { fr: 'Joueurs inscrits', en: 'Registered players' },
            { fr: 'Capsules ouvertes', en: 'Capsules opened' },
            {
              fr: 'Joueurs actifs cette semaine',
              en: 'Active players this week',
            },
            { fr: 'Cartes disponibles', en: 'Available cards' },
            { fr: 'Cartes légendaires obtenues', en: 'Legendary cards pulled' },
            { fr: "Capsules ouvertes aujourd'hui", en: 'Capsules opened today' },
            { fr: 'Poussière totale accumulée', en: 'Total dust accumulated' },
            { fr: 'Sets disponibles', en: 'Available sets' },
            {
              fr: 'Cartes légendaires existantes',
              en: 'Existing legendary cards',
            },
          ],
        },
      ],
    },
  },
  {
    path: '/discord',
    navLabel: { fr: 'Bot Discord', en: 'Discord Bot' },
    title: { fr: 'Bot Discord — Gachapon', en: 'Discord Bot — Gachapon' },
    description: {
      fr: "Connecte ton serveur Discord à Gachapon via l'API publique. Tire des capsules, consulte ta collection et suis le classement sans quitter Discord.",
      en: 'Connect your Discord server to Gachapon through the public API. Pull capsules, check your collection, and follow the leaderboard without leaving Discord.',
    },
    sitemap: { changefreq: 'monthly', priority: '0.6' },
    staticBlock: {
      heading: { fr: 'Bot Discord', en: 'Discord Bot' },
      lead: {
        fr: "Connecte ton serveur Discord à Gachapon via l'API publique. Tes membres pourront tirer des capsules, consulter leur collection et suivre le classement — sans quitter Discord.",
        en: 'Connect your Discord server to Gachapon through the public API. Your members can pull capsules, check their collection, and follow the leaderboard — without leaving Discord.',
      },
      sections: [
        {
          h: { fr: 'Les étapes', en: 'The steps' },
          // Reprend les <Step> de src/routes/discord.tsx, via
          // discord:steps.step<N>.title des deux locales.
          items: [
            {
              fr: "Créer l'application Discord",
              en: 'Create the Discord application',
            },
            {
              fr: 'Générer ta clé API Gachapon',
              en: 'Generate your Gachapon API key',
            },
            { fr: 'Initialiser le projet', en: 'Set up the project' },
            {
              fr: 'Enregistrer les commandes slash',
              en: 'Register the slash commands',
            },
            { fr: 'Commande /pull', en: 'The /pull command' },
            {
              fr: 'Commandes /collection et /classement',
              en: 'The /collection and /classement commands',
            },
            { fr: 'Assembler le bot', en: 'Assemble the bot' },
            { fr: 'Aller plus loin', en: 'Going further' },
          ],
        },
      ],
    },
  },
  {
    path: '/api-docs',
    navLabel: { fr: 'API publique', en: 'Public API' },
    title: { fr: 'API publique — Gachapon', en: 'Public API — Gachapon' },
    description: {
      fr: "Documentation de l'API publique de Gachapon : référence des endpoints, authentification par clé d'API et intégration dans vos propres outils et bots Discord.",
      en: 'Documentation for the Gachapon public API: endpoint reference, API-key authentication, and integration into your own tools and Discord bots.',
    },
    sitemap: { changefreq: 'monthly', priority: '0.5' },
    // La page n'est qu'un embed Scalar, rendu entièrement côté client : sans ce
    // bloc, Googlebot ne voit strictement rien sur cette URL. C'est aussi la
    // seule route dont le bloc n'a AUCUN équivalent dans src/i18n/locales/ —
    // la page n'affiche aucune copie à elle.
    staticBlock: {
      heading: { fr: 'API publique', en: 'Public API' },
      lead: {
        fr: "La référence des endpoints de Gachapon, générée depuis le schéma OpenAPI du serveur. L'authentification se fait par clé d'API, à passer dans l'en-tête X-API-Key.",
        en: "The reference for Gachapon's endpoints, generated from the server's OpenAPI schema. Authentication uses an API key, passed in the X-API-Key header.",
      },
      sections: [
        {
          h: { fr: 'À quoi elle sert', en: 'What it is for' },
          p: {
            fr: "Elle permet de brancher tes propres outils sur ton compte : tirer des capsules, lire ta collection et consulter les classements depuis l'extérieur du site. Le guide d'intégration pas à pas vit sur la page Bot Discord.",
            en: 'It lets you plug your own tools into your account: pull capsules, read your collection, and check the leaderboards from outside the site. The step-by-step integration guide lives on the Discord Bot page.',
          },
        },
      ],
    },
  },
]

/**
 * Métadonnées de site qui dépendent de la langue mais pas de la route :
 * `<html lang>`, `og:locale`, et les champs du JSON-LD d'index.html que
 * prerender-seo.mjs réécrit par arbre.
 *
 * Ici et non dans index.html : ce dernier n'existe qu'en un exemplaire et
 * sert de gabarit aux deux arbres.
 */
export const SITE_META = {
  fr: {
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    inLanguage: 'fr-FR',
    siteDescription:
      'Jeu de cartes à collectionner en ligne inspiré des capsules japonaises.',
    genre: ['Jeu de cartes', 'Collection', 'Gacha'],
    ogImageAlt:
      'Gachapon — le jeu de cartes à collectionner inspiré des capsules japonaises',
    navAriaLabel: 'Pages du site',
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    inLanguage: 'en-US',
    siteDescription:
      'Online trading card game inspired by Japanese capsule machines.',
    genre: ['Card game', 'Collecting', 'Gacha'],
    ogImageAlt:
      'Gachapon — the trading card game inspired by Japanese capsule machines',
    navAriaLabel: 'Site pages',
  },
}

/**
 * Langues servies, dans l'ordre où les arbres sont écrits. Doit rester égal à
 * SUPPORTED_LOCALES de src/i18n/index.ts — ce fichier ne peut pas l'importer
 * (il est lu par Node sans transpilation), d'où la duplication, que
 * `assertLocalesMatchI18n()` dans check-seo-dist.mjs vérifie.
 */
export const SEO_LOCALES = ['fr', 'en']

/**
 * Langue vers laquelle pointe `hreflang="x-default"` et vers laquelle retombe
 * nginx quand `Accept-Language` n'est pas francophone. Même valeur que
 * DEFAULT_LOCALE de src/i18n/index.ts (voir SEO_LOCALES pour la duplication).
 */
export const DEFAULT_SEO_LOCALE = 'en'

/**
 * Langue vers laquelle les anciennes URLs sans préfixe partent en 301 : le
 * site n'existait qu'en français avant ce chantier, donc tout le capital
 * d'indexation à préserver est français.
 */
export const LEGACY_LOCALE = 'fr'

export const SITE_ORIGIN = 'https://playgachapon.com'
