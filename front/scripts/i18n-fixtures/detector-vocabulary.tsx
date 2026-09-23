// Fixture du garde-fou — LE VOCABULAIRE DU DÉTECTEUR, mot par mot.
//
// POURQUOI (revue, round 2). Les autres fixtures comparent des LIGNES, et
// chacune de leurs lignes porte plusieurs marqueurs français : en retirer un
// de `FRENCH_WORDS` ne fait pas changer la ligne de camp, donc l'auto-test
// restait vert. Or retirer un mot est EXACTEMENT le geste que fera le
// prochain qui rencontre un faux positif — l'affaiblissement le plus
// probable était le seul hors garde.
//
// Ce fichier donne à CHAQUE entrée des deux détecteurs sa propre ligne, qui
// ne porte rien d'autre. Une ligne = une occurrence, exactement. Retirer un
// mot de `FRENCH_WORDS` ou un caractère de `ACCENT_RE` fait tomber sa ligne
// de 1 à 0, et `check-i18n-guard-selftest.mjs` l'attrape — il vérifie aussi
// que l'inventaire de ce fichier est IDENTIQUE à celui du script, pour qu'un
// mot ajouté sans sa ligne soit signalé lui aussi.
//
// GÉNÉRÉ depuis `check-i18n-hardcoded.mjs`. Pour le régénérer après un ajout
// au détecteur, la recette est dans le rapport de la tâche 12 (§2.4 bis).
//
// NE PAS REFORMATER, NE PAS TRIER : l'ordre est celui du script.

export function DetectorVocabulary() {
  return (
    <div>
      {/* --- FRENCH_WORDS --- */}
      <p>vous</p>
      <p>votre</p>
      <p>vos</p>
      <p>notre</p>
      <p>nos</p>
      <p>leur</p>
      <p>leurs</p>
      <p>des</p>
      <p>les</p>
      <p>une</p>
      <p>dans</p>
      <p>pour</p>
      <p>avec</p>
      <p>sans</p>
      <p>sur</p>
      <p>entre</p>
      <p>cette</p>
      <p>ces</p>
      <p>mais</p>
      <p>tout</p>
      <p>tous</p>
      <p>toute</p>
      <p>toutes</p>
      <p>quand</p>
      <p>quoi</p>
      <p>chaque</p>
      <p>toujours</p>
      <p>jamais</p>
      <p>plusieurs</p>
      <p>aucun</p>
      <p>aucune</p>
      <p>est</p>
      <p>erreur</p>
      <p>lors</p>
      <p>chargement</p>
      <p>enregistrement</p>
      <p>echec</p>
      <p>ajout</p>
      <p>envoi</p>
      <p>changement</p>
      <p>retour</p>
      <p>connexion</p>
      <p>niveau</p>
      <p>joueur</p>
      <p>joueurs</p>
      <p>cartes</p>
      <p>jour</p>
      <p>jours</p>
      <p>autre</p>
      <p>autres</p>
      <p>depuis</p>
      <p>voir</p>
      <p>utilisateur</p>
      <p>utilisateurs</p>
      <p>administrateur</p>
      <p>invalide</p>
      <p>invalides</p>
      <p>identifiants</p>
      <p>compte</p>
      <p>comptes</p>
      <p>existant</p>
      <p>trop</p>
      <p>tentatives</p>
      <p>connecter</p>
      <p>campagne</p>
      <p>tirage</p>
      <p>tirages</p>
      <p>variantes</p>
      <p>ajouter</p>
      <p>supprimer</p>
      <p>afficher</p>
      <p>enregistrer</p>
      <p>envoyer</p>
      <p>annuler</p>
      <p>valider</p>
      <p>confirmer</p>
      <p>continuer</p>
      <p>commencer</p>
      <p>fermer</p>
      <p>choisir</p>
      <p>essaie</p>
      <p>essayer</p>
      <p>attends</p>
      <p>actuel</p>
      <p>actuelle</p>
      <p>prochain</p>
      <p>prochaine</p>
      <p>dernier</p>
      <p>suivant</p>
      <p>suivante</p>
      <p>disponible</p>
      <p>disponibles</p>
      <p>manquant</p>
      <p>pleine</p>
      <p>du</p>
      <p>ou</p>
      {/* --- ACCENT_RE --- */}
      <p>à</p>
      <p>â</p>
      <p>ä</p>
      <p>é</p>
      <p>è</p>
      <p>ê</p>
      <p>ë</p>
      <p>ï</p>
      <p>î</p>
      <p>ô</p>
      <p>ö</p>
      <p>ù</p>
      <p>û</p>
      <p>ü</p>
      <p>ÿ</p>
      <p>ç</p>
      <p>œ</p>
      <p>æ</p>
      <p>À</p>
      <p>Â</p>
      <p>Ä</p>
      <p>É</p>
      <p>È</p>
      <p>Ê</p>
      <p>Ë</p>
      <p>Ï</p>
      <p>Î</p>
      <p>Ô</p>
      <p>Ö</p>
      <p>Ù</p>
      <p>Û</p>
      <p>Ü</p>
      <p>Ÿ</p>
      <p>Ç</p>
      <p>Œ</p>
      <p>Æ</p>
    </div>
  )
}
