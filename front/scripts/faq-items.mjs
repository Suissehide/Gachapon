// FAQ content for the landing page — single source of truth.
//
// Lives in plain .mjs so BOTH consumers can read it:
//   1. src/routes/index.tsx — renders the accordion + the FAQPage JSON-LD.
//   2. scripts/prerender-seo.mjs — bakes the same Q/A into the static HTML of
//      `/`, so a crawler that doesn't run JS still gets real content.
//
// Keeping one copy matters: if the static HTML and the rendered page disagreed,
// Google would compare two different pages for the same URL.

export const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que Gachapon ?",
    a: 'Gachapon est un jeu de cartes à collectionner en ligne gratuit, inspiré des distributeurs automatiques de capsules japonaises (gashapon). Tu utilises des jetons quotidiens pour tirer des capsules et obtenir des cartes de rareté variable, que tu rassembles dans ta collection personnelle.',
  },
  {
    q: 'Comment obtenir des jetons pour tirer ?',
    a: "Chaque joueur reçoit des jetons régénérés automatiquement au fil du temps. Tu peux également gagner des jetons supplémentaires via les récompenses de connexion quotidienne (streak), les jalons spéciaux et certaines compétences débloquées dans l'arbre de compétences.",
  },
  {
    q: 'Quelles sont les raretés disponibles ?',
    a: 'Cinq niveaux de rareté existent : commune, peu commune, rare, épique et légendaire. Chaque carte peut aussi apparaître en trois variantes visuelles : standard, brillante (à partir des raretés rare) et holographique. Les variantes brillantes et holographiques sont les plus convoitées.',
  },
  {
    q: 'Que faire des doublons ?',
    a: "Les doublons sont automatiquement convertibles en poussière, une ressource secondaire qui permet d'acheter des cartes ciblées dans la boutique quotidienne, d'investir dans l'arbre de compétences ou de débloquer certaines variantes. Aucune carte n'est jamais perdue.",
  },
  {
    q: "Qu'est-ce que le système de pitié ?",
    a: "Le système de pitié garantit qu'une suite de tirages malchanceux ne dure pas indéfiniment. Plus tu enchaînes de pulls sans obtenir une carte rare, plus la probabilité d'en obtenir une augmente, jusqu'à un seuil garanti.",
  },
  {
    q: 'Peut-on jouer avec ses amis ?',
    a: 'Oui. Tu peux créer ou rejoindre une équipe, comparer vos collections, votre progression et vos cartes les plus rares. Une API publique et un bot Discord permettent également de partager tes tirages en dehors du site.',
  },
  {
    q: 'Gachapon est-il gratuit ?',
    a: "Oui. L'accès est entièrement gratuit, sans téléchargement ni microtransaction. Tout le contenu est accessible via le jeu lui-même.",
  },
]
