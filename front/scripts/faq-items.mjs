// FAQ de la landing, lue par src/routes/index.tsx (accordéon + JSON-LD) et par
// prerender-seo.mjs. Une seule copie : si le HTML statique et la page rendue
// divergeaient, Google comparerait deux pages pour une même URL.
//
// BILINGUE (lot 3), même forme `{ fr, en }` que seo-routes.mjs, et pour la
// même raison : l'invariant « une seule copie » ci-dessus est ce qui interdit
// de déporter ces textes dans src/i18n/locales/. prerender-seo.mjs tourne sous
// Node, sans le résolveur de modules de Vite ni i18next ; lui faire lire les
// ressources de l'app ferait de ce script de build un second consommateur de
// la couche i18n. À l'inverse, laisser le français ici et l'anglais là-bas
// garantirait la divergence.
//
// ANGLE MORT ASSUMÉ : `scripts/` n'est scanné ni par Biome (exclu de la
// configuration) ni par check-i18n-hardcoded.mjs (qui ne lit que src/**.ts,tsx).
// Le français de ce fichier est donc invisible pour les garde-fous du lot 2 —
// c'est d'ailleurs par cet angle mort que la FAQ anglaise était restée en
// français sur /en après le lot 2. Toute chaîne ajoutée ici doit l'être dans
// les deux langues à la main ; `assertLocalized()` de prerender-seo.mjs est le
// seul filet, et il ne se déclenche qu'au build.

export const FAQ_ITEMS = [
  {
    q: {
      fr: "Qu'est-ce que Gachapon ?",
      en: 'What is Gachapon?',
    },
    a: {
      fr: 'Gachapon est un jeu de cartes à collectionner en ligne gratuit, inspiré des distributeurs automatiques de capsules japonaises (gashapon). Tu utilises des jetons quotidiens pour tirer des capsules et obtenir des cartes de rareté variable, que tu rassembles dans ta collection personnelle.',
      en: 'Gachapon is a free online trading card game, inspired by Japanese capsule vending machines (gashapon). You spend daily tokens to pull capsules and get cards of varying rarity, which you gather in your personal collection.',
    },
  },
  {
    q: {
      fr: 'Comment obtenir des jetons pour tirer ?',
      en: 'How do I get tokens to pull?',
    },
    a: {
      fr: "Chaque joueur reçoit des jetons régénérés automatiquement au fil du temps. Tu peux également gagner des jetons supplémentaires via les récompenses de connexion quotidienne (streak), les jalons spéciaux et certaines compétences débloquées dans l'arbre de compétences.",
      en: 'Every player gets tokens that regenerate automatically over time. You can also earn extra tokens from daily login rewards (streak), special milestones, and some of the skills unlocked in the skill tree.',
    },
  },
  {
    q: {
      fr: 'Quelles sont les raretés disponibles ?',
      en: 'Which rarities exist?',
    },
    a: {
      fr: 'Cinq niveaux de rareté existent : commune, peu commune, rare, épique et légendaire. Chaque carte peut aussi apparaître en trois variantes visuelles : standard, brillante (à partir des raretés rare) et holographique. Les variantes brillantes et holographiques sont les plus convoitées.',
      en: 'There are five rarity tiers: common, uncommon, rare, epic, and legendary. Every card can also show up in three visual variants: standard, brilliant (from rare upwards), and holographic. Brilliant and holographic variants are the most sought after.',
    },
  },
  {
    q: {
      fr: 'Que faire des doublons ?',
      en: 'What do I do with duplicates?',
    },
    a: {
      fr: "Les doublons sont automatiquement convertibles en poussière, une ressource secondaire qui permet d'acheter des cartes ciblées dans la boutique quotidienne, d'investir dans l'arbre de compétences ou de débloquer certaines variantes. Aucune carte n'est jamais perdue.",
      en: 'Duplicates can be turned into dust, a secondary resource you spend to buy specific cards in the daily shop, invest in the skill tree, or unlock certain variants. No card is ever lost.',
    },
  },
  {
    q: {
      fr: "Qu'est-ce que le système de pitié ?",
      en: 'What is the pity system?',
    },
    a: {
      fr: "Le système de pitié garantit qu'une suite de tirages malchanceux ne dure pas indéfiniment. Plus tu enchaînes de pulls sans obtenir une carte rare, plus la probabilité d'en obtenir une augmente, jusqu'à un seuil garanti.",
      en: 'The pity system makes sure an unlucky streak cannot last forever. The more pulls you chain without landing a rare card, the higher the odds of getting one become, up to a guaranteed threshold.',
    },
  },
  {
    q: {
      fr: 'Peut-on jouer avec ses amis ?',
      en: 'Can I play with my friends?',
    },
    a: {
      fr: 'Oui. Tu peux créer ou rejoindre une équipe, comparer vos collections, votre progression et vos cartes les plus rares. Une API publique et un bot Discord permettent également de partager tes tirages en dehors du site.',
      en: 'Yes. You can create or join a team and compare your collections, your progress, and your rarest cards. A public API and a Discord bot also let you share your pulls outside the site.',
    },
  },
  {
    q: {
      fr: 'Gachapon est-il gratuit ?',
      en: 'Is Gachapon free?',
    },
    a: {
      fr: "Oui. L'accès est entièrement gratuit, sans téléchargement ni microtransaction. Tout le contenu est accessible via le jeu lui-même.",
      en: 'Yes. Access is completely free, with no download and no microtransactions. All the content is reachable through the game itself.',
    },
  },
]
