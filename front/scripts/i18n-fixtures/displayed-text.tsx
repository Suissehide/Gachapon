// Fixture du garde-fou — TEXTE AFFICHÉ, doit rester DÉTECTÉ.
//
// Ce fichier n'est ni compilé (tsconfig.app.json n'inclut que `src`) ni linté
// (biome.json n'inclut que `src/**`) ni importé : c'est une entrée de test
// pour `check-i18n-guard-selftest.mjs`, pas du code d'application. Les accents
// sont volontairement absents de certaines phrases pour que le détecteur de
// MOTS soit exercé autant que le détecteur d'ACCENTS.
//
// NE PAS REFORMATER : les numéros de ligne attendus sont déclarés dans
// `check-i18n-guard-selftest.mjs`.

export function DisplayedText() {
  return (
    <div
      title="Voir les cartes de votre collection"
      placeholder="Entrez votre nom"
      aria-label="Fermer la fenetre des cartes"
      alt="Une carte pour vous"
      label="Choisir une carte"
    >
      <p>Aucune carte ne correspond a ces filtres.</p>
      <span>Retour a l'equipe</span>
      <code>{`// Commentaire affiche dans un bloc de code pour les joueurs
const x = 1`}</code>
    </div>
  )
}
