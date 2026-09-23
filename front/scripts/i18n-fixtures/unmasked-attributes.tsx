// Fixture du garde-fou — ATTRIBUTS VOLONTAIREMENT NON MASQUÉS.
//
// `className` et `data-*` avaient été masqués par prudence à la première
// écriture des masques structurels (tâche 12). La revue les a retirés sur ce
// critère, qui vaut pour toute demande d'ajout future :
//
//   une exception à un garde-fou se mérite par un faux positif OBSERVÉ,
//   elle ne s'accorde jamais par précaution.
//
// Aucun faux positif réel ne les justifiait : le scan complet du dépôt reste
// vert sans eux. Cette fixture fige leur retrait — si quelqu'un les
// réintroduit « au cas où », l'auto-test tombe et l'oblige à produire le faux
// positif qui le mériterait.
//
// La ligne `data-id=` est là pour une raison précise (revue, round 2) : le
// masque `id` n'était ancré que par un `\b`, qui accroche après un tiret — un
// `data-id="…"` était donc masqué alors que le script affirmait le contraire.
// L'ancrage est corrigé ; cette ligne tient l'affirmation.
//
// Voir l'en-tête de `displayed-text.tsx` pour le statut de ces fixtures.
//
// NE PAS REFORMATER.

export function UnmaskedAttributes() {
  return (
    <div
      className="flex des cartes pour vous"
      data-section="une valeur avec des mots"
      data-testid="aucune carte disponible"
      data-id="aucune carte disponible pour vous"
    />
  )
}
